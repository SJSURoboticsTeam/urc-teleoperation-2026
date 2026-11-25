import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { clearInterval, setInterval } from "node:timers";

const execFileAsync = promisify(execFile);
const moduleId = "virtual:git-version";
const resolvedId = `\0${moduleId}`;

async function readGitVersion(root) {
  const git = async (args) => {
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
    git(["log", "-1", "--format=%H%n%s"]),
    git(["rev-parse", "--abbrev-ref", "HEAD"]),
  ]);
  const [sha, ...subject] = commit?.split("\n") ?? [];
  return { sha: sha || null, branch, message: commit ? subject.join("\n") : null };
}

export default function gitVersionPlugin() {
  let root;
  let version;
  let timer;
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
      let refreshing = false;
      timer = setInterval(async () => {
        if (refreshing) return;
        refreshing = true;
        try {
          const next = await readGitVersion(root);
          if (closed) return;
          if (JSON.stringify(next) !== JSON.stringify(version)) {
            version = next;
            const module = server.moduleGraph.getModuleById(resolvedId);
            if (module) {
              server.moduleGraph.invalidateModule(module);
              await server.reloadModule(module);
            }
          }
        } catch (error) {
          server.config.logger.error(`Git version refresh failed: ${error.message}`);
        } finally {
          refreshing = false;
        }
      }, 1000);
      timer.unref();
    },
    closeBundle() {
      closed = true;
      clearInterval(timer);
    },
  };
}
