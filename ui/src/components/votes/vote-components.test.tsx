import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CandidateList } from "./candidate-list";
import { VoteParticipationBar } from "./vote-participation-bar";
import { VoteStatusBadge } from "./vote-status-badge";

describe("vote shared components", () => {
  it("renders status, participation, and candidate labels", () => {
    const markup = renderToStaticMarkup(
      <>
        <VoteStatusBadge status="active" />
        <VoteParticipationBar participatedCount={7} electorCount={10} />
        <CandidateList
          candidates={[
            {
              id: "candidate-1",
              name: "김대표",
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
});
