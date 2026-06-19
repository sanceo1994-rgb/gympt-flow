import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const mode = process.argv[2];
const cliEntry = resolve("node_modules/supabase/dist/supabase.js");

function fail(message) {
  console.error(`\n[db] ${message}`);
  process.exit(1);
}

function runSupabase(args, capture = false) {
  if (!existsSync(cliEntry)) fail("고정된 Supabase CLI가 없습니다. 먼저 npm install을 실행하세요.");
  const result = spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
    shell: false,
  });

  if (capture) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
  if (result.error) fail(`Supabase CLI를 실행하지 못했습니다: ${result.error.message}`);
  if (result.status !== 0) process.exit(result.status ?? 1);
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

function projectRefFromConfig() {
  if (!existsSync("supabase/config.toml")) fail("supabase/config.toml이 없습니다.");
  const config = readFileSync("supabase/config.toml", "utf8");
  const ref = config.match(/^project_id\s*=\s*"([a-z0-9]+)"/m)?.[1];
  if (!ref) fail("supabase/config.toml에서 project_id를 읽지 못했습니다.");

  if (existsSync("supabase/.temp/project-ref")) {
    const linkedRef = readFileSync("supabase/.temp/project-ref", "utf8").trim();
    if (linkedRef && linkedRef !== ref) {
      fail(`연결된 프로젝트(${linkedRef})와 config.toml(${ref})이 다릅니다. db push를 중단합니다.`);
    }
  }
  console.log(`[db] target project: ${ref}`);
  return ref;
}

function migrationState() {
  projectRefFromConfig();
  const output = runSupabase(["migration", "list", "--linked"], true);
  const rows = [];
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^\s*(\d{14})?\s*\|\s*(\d{14})?\s*\|/);
    if (match && (match[1] || match[2])) rows.push({ local: match[1] || "", remote: match[2] || "" });
  }
  if (!rows.length) fail("migration list 결과를 해석하지 못했습니다. CLI 출력과 로그인 상태를 확인하세요.");

  const remoteVersions = rows.map((row) => row.remote).filter(Boolean).sort();
  const latestRemote = remoteVersions.at(-1) ?? "";
  const remoteOnly = rows.filter((row) => !row.local && row.remote);
  const historicalLocalGaps = rows.filter((row) => row.local && !row.remote && latestRemote && row.local < latestRemote);
  const pending = rows.filter((row) => row.local && !row.remote && (!latestRemote || row.local > latestRemote));

  if (remoteOnly.length) {
    console.error(`[db] 원격에만 존재하는 버전: ${remoteOnly.map((row) => row.remote).join(", ")}`);
  }
  if (historicalLocalGaps.length) {
    console.error(`[db] 원격 최신 버전보다 오래된 로컬 미기록 버전: ${historicalLocalGaps.map((row) => row.local).join(", ")}`);
  }
  if (pending.length) console.log(`[db] push 대기 버전: ${pending.map((row) => row.local).join(", ")}`);

  return { remoteOnly, historicalLocalGaps, pending };
}

function assertSafeHistory(state) {
  if (state.remoteOnly.length || state.historicalLocalGaps.length) {
    fail("마이그레이션 기록 드리프트가 있습니다. docs/DATABASE_WORKFLOW.md의 복구 절차로 감사하기 전에는 push할 수 없습니다.");
  }
}

if (mode === "new") {
  const name = process.argv[3];
  if (!name || !/^[a-z0-9][a-z0-9_-]*$/.test(name)) {
    fail("사용법: npm run db:new -- add_feature_name (영문 소문자, 숫자, -, _만 허용)");
  }
  runSupabase(["migration", "new", name]);
} else if (mode === "status") {
  const state = migrationState();
  if (state.remoteOnly.length || state.historicalLocalGaps.length) {
    console.warn("\n[db] 경고: 현재 기록이 불일치합니다. db:push는 차단됩니다.");
  } else {
    console.log("\n[db] migration history에 설명되지 않은 과거 간극이 없습니다.");
  }
} else if (mode === "dry-run") {
  const state = migrationState();
  assertSafeHistory(state);
  runSupabase(["db", "push", "--linked", "--dry-run"]);
} else if (mode === "push") {
  const state = migrationState();
  assertSafeHistory(state);
  console.log("\n[db] dry-run을 실행합니다.");
  runSupabase(["db", "push", "--linked", "--dry-run"]);
  console.log("\n[db] dry-run 통과. 마이그레이션을 적용합니다.");
  runSupabase(["db", "push", "--linked"]);
  console.log("\n[db] 적용 후 상태를 다시 확인합니다.");
  migrationState();
} else {
  fail("지원 명령: new, status, dry-run, push");
}
