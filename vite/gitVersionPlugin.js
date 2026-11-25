import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { clearInterval, setInterval } from "node:timers";

const execFileAsync = promisify(execFile);
const moduleId = "virtual:git-version";
const resolvedId = `\0${moduleId}`;

async function readGitVersion(root) {
  const readGitOutputOrNull = async (args) => {
    try {
      const { stdout } = await execFileAsync("git", args, {
        cwd: root,
        encoding: "utf8",
        timeout: 2000,
      });
      return stdout.trim();
    } catch {
      return null;
    }
  };
  const [commit, branch] = await Promise.all([
    readGitOutputOrNull(["log", "-1", "--format=%H%n%s"]),
    readGitOutputOrNull(["rev-parse", "--abbrev-ref", "HEAD"]),
  ]);
  const [sha, ...subject] = commit?.split("\n") ?? [];
  return { sha: sha || null, branch, message: commit ? subject.join("\n") : null };
}

export default function gitVersionPlugin() {
  let root;
  let version;
  let gitPollTimer;
  let closed = false;

  return {
    name: "git-version",
    configResolved(config) {
      root = config.root;
    },
    async buildStart() {
      version = await readGitVersion(root);
    },
    resolveId(id) {
      if (id === moduleId) return resolvedId;
    },
    load(id) {
      if (id === resolvedId) return `export default ${JSON.stringify(version)};`;
    },
    configureServer(server) {
      closed = false;
      let gitReadInProgress = false;
      gitPollTimer = setInterval(async () => {
        if (gitReadInProgress) return;
        gitReadInProgress = true;
        try {
          const next = await readGitVersion(root);
          if (closed) return;
          if (JSON.stringify(next) !== JSON.stringify(version)) {
            version = next;
            const virtualVersionModule = server.moduleGraph.getModuleById(resolvedId);
            if (virtualVersionModule) {
              server.moduleGraph.invalidateModule(virtualVersionModule);
              await server.reloadModule(virtualVersionModule);
            }
          }
        } catch (error) {
          server.config.logger.error(`Git version refresh failed: ${error.message}`);
        } finally {
          gitReadInProgress = false;
        }
      }, 1000);
      gitPollTimer.unref();
    },
    closeBundle() {
      closed = true;
      clearInterval(gitPollTimer);
    },
  };
}
