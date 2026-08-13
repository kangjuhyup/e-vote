import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OrderedOptionList } from "./collections/ordered-option-list";
import { ParticipantRoster } from "./collections/participant-roster";
import { ParticipationProgress } from "./data/participation-progress";
import { StatusBadge } from "./data/status-badge";

describe("feature-independent components", () => {
  it("renders generic status, progress, and ordered option content", () => {
    const markup = renderToStaticMarkup(
      <>
        <StatusBadge label="진행 중" variant="default" />
        <ParticipationProgress value={7} max={10} />
        <OrderedOptionList
          title="선택 항목"
          items={[
            {
              id: "candidate-1",
              title: "김대표",
              description: "운영 개선",
              order: 1,
            },
          ]}
        />
      </>,
    );

    expect(markup).toContain("진행 중");
    expect(markup).toContain("70%");
    expect(markup).toContain("김대표");
  });

  it("renders empty labels for generic collection components", () => {
    const markup = renderToStaticMarkup(
      <>
        <OrderedOptionList
          title="선택 항목"
          items={[]}
          emptyLabel="선택 항목이 없습니다."
        />
        <ParticipantRoster
          title="참여자"
          items={[]}
          emptyLabel="참여자가 없습니다."
        />
      </>,
    );

    expect(markup).toContain("선택 항목이 없습니다.");
    expect(markup).toContain("참여자가 없습니다.");
  });
});
