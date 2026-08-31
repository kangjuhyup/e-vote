import type { Cell, Workbook, Worksheet } from "exceljs";

import type {
  ElectoralRollImportMemberInput,
  ElectoralRollWorkbookError,
  ElectoralRollWorkbookParseResult,
} from "../model/electoral-roll.types";

export const ELECTORAL_ROLL_TEMPLATE_SHEET = "선거인명부";
export const ELECTORAL_ROLL_TEMPLATE_HEADERS = [
  "구성원 식별자",
  "그룹 키",
  "투표 가중치",
] as const;
export const MAX_ELECTORAL_ROLL_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_ELECTORAL_ROLL_IMPORT_ROWS = 5_000;

const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const ALLOWED_MIME_TYPES = new Set([
  "",
  XLSX_MIME_TYPE,
  "application/octet-stream",
]);

async function createWorkbook(): Promise<Workbook> {
  const ExcelJS = await import("exceljs");
  return new ExcelJS.Workbook();
}

export async function createElectoralRollTemplateBuffer(): Promise<ArrayBuffer> {
  const workbook = await createWorkbook();
  workbook.creator = "Vote";
  workbook.created = new Date();

  const instructionSheet = workbook.addWorksheet("작성 안내", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  instructionSheet.columns = [
    { key: "item", width: 22 },
    { key: "description", width: 72 },
  ];
  instructionSheet.addRow(["항목", "작성 방법"]);
  instructionSheet.addRows([
    ["구성원 식별자", "필수. 사번·회원번호 등 구성원을 구분하는 값을 입력합니다."],
    ["그룹 키", "선택. 부서·지점 등 집계에 사용할 그룹을 입력합니다."],
    ["투표 가중치", "선택. 양수를 입력하며, 비워두면 1로 적용됩니다."],
    ["업로드 제한", "빈 행을 제외하고 최대 5,000명, 파일 크기 최대 5MB입니다."],
    ["주의", "열 이름과 순서를 바꾸거나 수식을 입력하지 마세요."],
  ]);
  styleHeader(instructionSheet.getRow(1));

  const dataSheet = workbook.addWorksheet(ELECTORAL_ROLL_TEMPLATE_SHEET, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  dataSheet.columns = [
    { header: ELECTORAL_ROLL_TEMPLATE_HEADERS[0], key: "identifier", width: 28 },
    { header: ELECTORAL_ROLL_TEMPLATE_HEADERS[1], key: "groupKey", width: 24 },
    { header: ELECTORAL_ROLL_TEMPLATE_HEADERS[2], key: "voteWeight", width: 18 },
  ];
  styleHeader(dataSheet.getRow(1));
  dataSheet.autoFilter = "A1:C1";
  dataSheet.getColumn(1).numFmt = "@";
  dataSheet.getColumn(2).numFmt = "@";
  for (let rowNumber = 2; rowNumber <= MAX_ELECTORAL_ROLL_IMPORT_ROWS + 1; rowNumber += 1) {
    dataSheet.getCell(rowNumber, 3).dataValidation = {
      type: "decimal",
      operator: "greaterThan",
      allowBlank: true,
      formulae: [0],
      showErrorMessage: true,
      errorTitle: "투표 가중치 오류",
      error: "0보다 큰 숫자를 입력하세요.",
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return toArrayBuffer(buffer);
}

export async function downloadElectoralRollTemplate(): Promise<void> {
  const buffer = await createElectoralRollTemplateBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: XLSX_MIME_TYPE }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "선거인명부_업로드_템플릿.xlsx";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function parseElectoralRollWorkbook(
  file: File,
): Promise<ElectoralRollWorkbookParseResult> {
  const fileError = validateFile(file);
  if (fileError) return { errors: [fileError], members: [] };

  const fileBuffer = await file.arrayBuffer();
  if (!hasZipSignature(fileBuffer)) {
    return {
      errors: [
        {
          message:
            "파일 내용이 표준 .xlsx 바이너리 형식이 아닙니다. 내려받은 템플릿을 사용하세요.",
        },
      ],
      members: [],
    };
  }

  const workbook = await createWorkbook();
  try {
    await workbook.xlsx.load(fileBuffer);
  } catch {
    return {
      errors: [{ message: "엑셀 파일을 읽을 수 없습니다. 템플릿 파일인지 확인하세요." }],
      members: [],
    };
  }

  const worksheet = workbook.getWorksheet(ELECTORAL_ROLL_TEMPLATE_SHEET);
  if (!worksheet) {
    return {
      errors: [{ message: `\"${ELECTORAL_ROLL_TEMPLATE_SHEET}\" 시트를 찾을 수 없습니다.` }],
      members: [],
    };
  }

  const headerError = validateHeaders(worksheet);
  if (headerError) return { errors: [headerError], members: [] };

  const errors: ElectoralRollWorkbookError[] = [];
  const members: ElectoralRollImportMemberInput[] = [];
  const identifiers = new Map<string, number>();

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1 || isEmptyDataRow(row.values)) return;
    if (members.length + errors.length >= MAX_ELECTORAL_ROLL_IMPORT_ROWS) {
      return;
    }

    const identifierCell = row.getCell(1);
    const groupKeyCell = row.getCell(2);
    const voteWeightCell = row.getCell(3);
    if ([identifierCell, groupKeyCell, voteWeightCell].some(hasFormula)) {
      errors.push({ rowNumber, message: "수식은 사용할 수 없습니다." });
      return;
    }

    const identifier = identifierCell.text.trim();
    const groupKey = groupKeyCell.text.trim() || undefined;
    const voteWeightText = voteWeightCell.text.trim();
    const voteWeight = voteWeightText.length === 0 ? 1 : Number(voteWeightText);

    if (identifier.length === 0) {
      errors.push({ rowNumber, message: "구성원 식별자를 입력하세요." });
      return;
    }
    if (!Number.isFinite(voteWeight) || voteWeight <= 0) {
      errors.push({ rowNumber, message: "투표 가중치는 0보다 큰 숫자여야 합니다." });
      return;
    }

    const identifierKey = identifier.toLocaleLowerCase();
    const duplicateRow = identifiers.get(identifierKey);
    if (duplicateRow) {
      errors.push({
        rowNumber,
        message: `${duplicateRow}행과 구성원 식별자가 중복됩니다.`,
      });
      return;
    }
    identifiers.set(identifierKey, rowNumber);
    members.push({ identifier, groupKey, voteWeight, rowNumber });
  });

  const nonEmptyDataRows = countNonEmptyDataRows(worksheet);
  if (nonEmptyDataRows > MAX_ELECTORAL_ROLL_IMPORT_ROWS) {
    return {
      errors: [
        {
          message: `한 번에 최대 ${MAX_ELECTORAL_ROLL_IMPORT_ROWS.toLocaleString()}명까지 업로드할 수 있습니다.`,
        },
      ],
      members: [],
    };
  }
  if (nonEmptyDataRows === 0) {
    return {
      errors: [{ message: "업로드할 구성원을 한 명 이상 입력하세요." }],
      members: [],
    };
  }

  return { errors, members };
}

function hasZipSignature(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 4));
  return (
    bytes.length === 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    ((bytes[2] === 0x03 && bytes[3] === 0x04) ||
      (bytes[2] === 0x05 && bytes[3] === 0x06) ||
      (bytes[2] === 0x07 && bytes[3] === 0x08))
  );
}

function validateFile(file: File): ElectoralRollWorkbookError | undefined {
  if (!file.name.toLocaleLowerCase().endsWith(".xlsx")) {
    return { message: ".xlsx 형식의 엑셀 파일만 업로드할 수 있습니다." };
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { message: "지원하지 않는 파일 형식입니다. .xlsx 템플릿을 사용하세요." };
  }
  if (file.size === 0) {
    return { message: "비어 있는 파일은 업로드할 수 없습니다." };
  }
  if (file.size > MAX_ELECTORAL_ROLL_IMPORT_BYTES) {
    return { message: "파일 크기는 5MB 이하여야 합니다." };
  }
}

function validateHeaders(
  worksheet: Worksheet,
): ElectoralRollWorkbookError | undefined {
  const headers = ELECTORAL_ROLL_TEMPLATE_HEADERS.map((_, index) =>
    worksheet.getCell(1, index + 1).text.trim(),
  );
  if (
    headers.some(
      (header, index) => header !== ELECTORAL_ROLL_TEMPLATE_HEADERS[index],
    )
  ) {
    return {
      rowNumber: 1,
      message: `열 이름과 순서를 템플릿과 동일하게 유지하세요: ${ELECTORAL_ROLL_TEMPLATE_HEADERS.join(", ")}`,
    };
  }
}

function hasFormula(cell: Cell): boolean {
  return (
    typeof cell.value === "object" &&
    cell.value !== null &&
    "formula" in cell.value
  );
}

function isEmptyDataRow(values: unknown): boolean {
  if (!Array.isArray(values)) return true;
  return values.slice(1, 4).every((value) => String(value ?? "").trim() === "");
}

function countNonEmptyDataRows(worksheet: Worksheet): number {
  let count = 0;
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > 1 && !isEmptyDataRow(row.values)) count += 1;
  });
  return count;
}

function styleHeader(row: ReturnType<Worksheet["getRow"]>): void {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F2937" },
  };
  row.alignment = { vertical: "middle" };
  row.height = 24;
}

function toArrayBuffer(buffer: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (buffer instanceof ArrayBuffer) return buffer;
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}
