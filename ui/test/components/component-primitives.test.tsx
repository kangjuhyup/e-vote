import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OrderedOptionList } from "@/components/collections/ordered-option-list";
import { ParticipantRoster } from "@/components/collections/participant-roster";
import { ParticipationProgress } from "@/components/data/participation-progress";
import { StatusBadge } from "@/components/data/status-badge";
import { SkeletonCardGrid } from "@/components/feedback/skeleton-card-grid";
import { SearchField } from "@/components/forms/search-field";
import { PageShell } from "@/components/layout/page-shell";

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

  it("renders unknown participation progress without implying zero votes", () => {
    const markup = renderToStaticMarkup(
      <ParticipationProgress value={0} max={12} isKnown={false} />,
    );

    expect(markup).toContain("집계 전");
    expect(markup).toContain("참여 집계 전 / 12명 대상");
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

  it("renders unknown roster participation as uncounted instead of not participated", () => {
    const markup = renderToStaticMarkup(
      <ParticipantRoster
        title="참여자"
        items={[
          {
            id: "elector-1",
            label: "운영팀",
            name: "이선거",
            participated: false,
            participatedAt: null,
            participationStatus: "unknown",
          },
        ]}
      />,
    );

    expect(markup).toContain("집계 전");
    expect(markup).not.toContain("미참여");
  });

  it("renders accessible page, search, and loading primitives", () => {
    const markup = renderToStaticMarkup(
      <PageShell
        eyebrow="운영 현황"
        title="투표 대시보드"
        description="투표 현황을 확인합니다."
        navigation={<span>대시보드 메뉴</span>}
      >
        <SearchField
          label="투표 제목 검색"
          placeholder="투표 제목 검색…"
          value=""
          onValueChange={() => undefined}
        />
        <SkeletonCardGrid count={1} />
      </PageShell>,
    );

    expect(markup).toContain('href="#main-content"');
    expect(markup).toContain('<main id="main-content"');
    expect(markup).toContain('<h1');
    expect(markup).toContain('type="search"');
    expect(markup).toContain('name="search"');
    expect(markup).toContain('autoComplete="off"');
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-busy="true"');
  });
});
