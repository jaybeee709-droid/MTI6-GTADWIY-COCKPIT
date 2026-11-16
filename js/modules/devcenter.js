/* MTI6-GTADWIY-COCKPIT — Development Center panel (V1, read-only)
 * Dashboard panel for the read-only GitHub layer in js/github-dev.js:
 * pull request state, repo info, and branch list for a public repo.
 * Rendering only — all fetching, parsing, and caching live in
 * github-dev.js. Guarded like Star/Prices/Scouts: if the layer fails
 * to load, the rest of the dashboard still renders. Nothing here can
 * merge, comment, create, or change anything on GitHub.
 */
(function (global) {
  "use strict";
  var U = global.U;
  if (!U) return;

  function fmtTime(iso) {
    if (global.KnowledgeScout && typeof global.KnowledgeScout.fmtTime === "function") {
      return global.KnowledgeScout.fmtTime(iso);
    }
    return iso || "";
  }

  function renderPanel() {
    var panel = U.el("section", { class: "api-panel", "aria-label": "Development Center" }, [
      U.el("h2", { class: "api-title" }, "🛠️ Development Center (read-only)"),
      U.el("div", { class: "api-subtitle" },
        "Public repo data only, no sign-in, no key. Unauthenticated GitHub reads share a 60/hour limit, so results are cached for 15 minutes. " +
        "Nothing here can merge, comment, or change anything — this only reports what GitHub already shows.")
    ]);

    var ownerInput = U.el("input", { class: "price-input", type: "text", value: "jaybeee709-droid", "aria-label": "GitHub owner" });
    var repoInput = U.el("input", { class: "price-input", type: "text", value: "MTI6-GTADWIY-COCKPIT", "aria-label": "GitHub repo" });
    var prInput = U.el("input", { class: "price-input", type: "text", value: "1", "aria-label": "Pull request number" });
    var loadBtn = U.el("button", { class: "btn btn-primary", type: "button" }, "Load repo status");
    var out = U.el("div", { class: "api-meta" }, "Tap Load repo status to see PR #1, repo info, and branches for this repo.");

    loadBtn.addEventListener("click", function () {
      out.textContent = "Loading…";
      global.GitHubDev.getRepoStatus(ownerInput.value, repoInput.value, prInput.value).then(function (r) {
        out.innerHTML = "";
        if (r.status === "error") { out.textContent = r.note; return; }
        out.appendChild(U.el("div", {}, "Live from " + r.source + " · " + fmtTime(r.fetchedAt)));
        if (r.pr) {
          var mergeable = r.pr.mergeable === true ? "yes" : (r.pr.mergeable === false ? "no — conflicts need resolving first" : "unknown");
          out.appendChild(U.el("div", {}, "Pull request #" + r.pr.number + ": “" + r.pr.title + "” — " + r.pr.state +
            (r.pr.merged ? " (merged)" : " (not merged)") + " · " + r.pr.headRef + " (" + global.GitHubDev.shortSha(r.pr.headSha) + ") → " +
            r.pr.baseRef + " · Mergeable: " + mergeable));
        } else if (r.prNote) {
          out.appendChild(U.el("div", {}, "Pull request: " + r.prNote));
        }
        if (r.repo) {
          out.appendChild(U.el("div", {}, "Repo: " + (r.repo.description || "no description") + " · Default branch: " + r.repo.defaultBranch +
            " · Last push: " + fmtTime(r.repo.pushedAt) + " · Open issues: " + r.repo.openIssues +
            " · Stars: " + r.repo.stars + " · Forks: " + r.repo.forks));
        } else if (r.repoNote) {
          out.appendChild(U.el("div", {}, "Repo: " + r.repoNote));
        }
        if (r.branches && r.branches.length) {
          var list = U.el("ul", { class: "price-offer-list" });
          r.branches.forEach(function (b) {
            list.appendChild(U.el("li", {}, b.name + " · " + global.GitHubDev.shortSha(b.sha)));
          });
          out.appendChild(U.el("div", {}, "Branches:"));
          out.appendChild(list);
        } else if (r.branchesNote) {
          out.appendChild(U.el("div", {}, "Branches: " + r.branchesNote));
        }
      });
    });

    panel.appendChild(U.el("div", { class: "api-row" }, [ownerInput, repoInput, prInput, loadBtn]));
    panel.appendChild(out);
    return panel;
  }

  global.DevCenterUI = { renderPanel: renderPanel };
})(window);
