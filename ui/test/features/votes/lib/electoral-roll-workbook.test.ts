import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import {
  createElectoralRollTemplateBuffer,
  ELECTORAL_ROLL_TEMPLATE_HEADERS,
  ELECTORAL_ROLL_TEMPLATE_SHEET,
  MAX_ELECTORAL_ROLL_IMPORT_BYTES,
  MAX_ELECTORAL_ROLL_IMPORT_ROWS,
  parseElectoralRollWorkbook,
} from "@/features/votes/lib/electoral-roll-workbook";

const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

describe("electoral roll workbook", () => {
  it("creates a template with instructions and the fixed data headers", async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await createElectoralRollTemplateBuffer());

    expect(workbook.getWorksheet("작성 안내")).toBeTruthy();
    const dataSheet = workbook.getWorksheet(ELECTORAL_ROLL_TEMPLATE_SHEET);
    expect(dataSheet).toBeTruthy();
    expect(
      ELECTORAL_ROLL_TEMPLATE_HEADERS.map((_, index) =>
        dataSheet?.getCell(1, index + 1).text,
      ),
    ).toEqual(ELECTORAL_ROLL_TEMPLATE_HEADERS);
  });

  it("normalizes valid rows and defaults a blank vote weight to one", async () => {
    const file = await workbookFile([
      ["employee-001", "김선거", "010-1234-5678", "1990-01-31", "seoul", 2],
      ["employee-002", "", "", "", "", ""],
    ]);

    await expect(parseElectoralRollWorkbook(file)).resolves.toEqual({
      errors: [],
      members: [
        {
          birthDate: "1990-01-31",
          identifier: "employee-001",
          groupKey: "seoul",
          name: "김선거",
          phoneNumber: "010-1234-5678",
          rowNumber: 2,
          voteWeight: 2,
        },
        {
          birthDate: undefined,
          identifier: "employee-002",
          groupKey: undefined,
          name: undefined,
          phoneNumber: undefined,
          rowNumber: 3,
          voteWeight: 1,
        },
      ],
    });
  });

  it("reports duplicate identifiers, formulas, and non-positive weights by row", async () => {
    const workbook = baseWorkbook();
    const sheet = workbook.getWorksheet(ELECTORAL_ROLL_TEMPLATE_SHEET)!;
    sheet.addRow(["employee-001", "", "", "", "seoul", 1]);
    sheet.addRow(["EMPLOYEE-001", "", "", "", "busan", 1]);
    sheet.addRow(["employee-003", "", "", "", "", { formula: "1+1", result: 2 }]);
    sheet.addRow(["employee-004", "", "", "", "", 0]);

    const result = await parseElectoralRollWorkbook(
      await toFile(workbook, "members.xlsx"),
    );

    expect(result.members).toHaveLength(1);
    expect(result.errors).toEqual([
      { rowNumber: 3, message: "2행과 구성원 식별자가 중복됩니다." },
      { rowNumber: 4, message: "수식은 사용할 수 없습니다." },
      {
        rowNumber: 5,
        message: "투표 가중치는 0보다 큰 숫자여야 합니다.",
      },
    ]);
  });

  it("validates identity profile pairing, phone digits, and real birth dates", async () => {
    const file = await workbookFile([
      ["employee-001", "김선거", "", "", "", 1],
      ["employee-002", "박선거", "123-456", "", "", 1],
      ["employee-003", "이선거", "010-1234-5678", "2026-02-30", "", 1],
      ["employee-004", "", "", "1990-01-01", "", 1],
    ]);

    await expect(parseElectoralRollWorkbook(file)).resolves.toEqual({
      errors: [
        { rowNumber: 2, message: "이름과 휴대폰번호는 함께 입력하세요." },
        {
          rowNumber: 3,
          message: "휴대폰번호는 표시 문자를 제외하고 숫자 8~15자리로 입력하세요.",
        },
        {
          rowNumber: 4,
          message: "생년월일은 유효한 YYYY-MM-DD 형식으로 입력하세요.",
        },
        {
          rowNumber: 5,
          message:
            "생년월일은 이름과 휴대폰번호를 함께 입력한 경우에만 입력할 수 있습니다.",
        },
      ],
      members: [],
    });
  });

  it("rejects files that do not match the template type, size, or headers", async () => {
    const wrongExtension = new File(["data"], "members.csv", {
      type: "text/csv",
    });
    const tooLarge = new File(
      [new Uint8Array(MAX_ELECTORAL_ROLL_IMPORT_BYTES + 1)],
      "members.xlsx",
      { type: XLSX_MIME_TYPE },
    );
    const disguisedText = new File(["not an xlsx archive"], "members.xlsx", {
      type: XLSX_MIME_TYPE,
    });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(ELECTORAL_ROLL_TEMPLATE_SHEET);
    sheet.addRow(["identifier", "group", "weight"]);
    sheet.addRow(["employee-001", "seoul", 1]);

    await expect(parseElectoralRollWorkbook(wrongExtension)).resolves.toEqual({
      errors: [{ message: ".xlsx 형식의 엑셀 파일만 업로드할 수 있습니다." }],
      members: [],
    });
    await expect(parseElectoralRollWorkbook(tooLarge)).resolves.toEqual({
      errors: [{ message: "파일 크기는 5MB 이하여야 합니다." }],
      members: [],
    });
    await expect(parseElectoralRollWorkbook(disguisedText)).resolves.toEqual({
      errors: [
        {
          message:
            "파일 내용이 표준 .xlsx 바이너리 형식이 아닙니다. 내려받은 템플릿을 사용하세요.",
        },
      ],
      members: [],
    });
    await expect(
      parseElectoralRollWorkbook(await toFile(workbook, "members.xlsx")),
    ).resolves.toEqual({
      errors: [
        {
          rowNumber: 1,
          message: `열 이름과 순서를 템플릿과 동일하게 유지하세요: ${ELECTORAL_ROLL_TEMPLATE_HEADERS.join(", ")}`,
        },
      ],
      members: [],
    });
  });

  it("rejects workbooks over the row limit", async () => {
    const workbook = baseWorkbook();
    const sheet = workbook.getWorksheet(ELECTORAL_ROLL_TEMPLATE_SHEET)!;
    for (let index = 0; index <= MAX_ELECTORAL_ROLL_IMPORT_ROWS; index += 1) {
      sheet.addRow([`employee-${index}`, "", "", "", "", 1]);
    }

    await expect(
      parseElectoralRollWorkbook(await toFile(workbook, "members.xlsx")),
    ).resolves.toEqual({
      errors: [
        {
          message: `한 번에 최대 ${MAX_ELECTORAL_ROLL_IMPORT_ROWS.toLocaleString()}명까지 업로드할 수 있습니다.`,
        },
      ],
      members: [],
    });
  }, 20_000);
});

function baseWorkbook() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(ELECTORAL_ROLL_TEMPLATE_SHEET);
  sheet.addRow([...ELECTORAL_ROLL_TEMPLATE_HEADERS]);
  return workbook;
}

async function workbookFile(rows: unknown[][]) {
  const workbook = baseWorkbook();
  const sheet = workbook.getWorksheet(ELECTORAL_ROLL_TEMPLATE_SHEET)!;
  rows.forEach((row) => sheet.addRow(row));
  return toFile(workbook, "members.xlsx");
}

async function toFile(workbook: ExcelJS.Workbook, name: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  return new File([buffer as ArrayBuffer], name, { type: XLSX_MIME_TYPE });
}
