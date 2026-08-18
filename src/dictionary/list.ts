import { DictionaryEngine, EngineResult } from "./engine";
import { YoudaoEngine } from "./youdao/engine";
import { CambridgeEngine } from "./cambridge/engine";
import { HjdictEngine } from "./hjdict/engine";
import { DeepLEngine } from "./deepl/engine";
import { AiEngine } from "./ai/engine";
import { FreeEngine } from "./free/engine";

const engines: DictionaryEngine[] = [
    YoudaoEngine,
    CambridgeEngine,
    HjdictEngine,
    DeepLEngine,
    AiEngine,
    FreeEngine,
];

// 按优先级排序（settings 里配置）
export function getEngines(enabledIds: string[]): DictionaryEngine[] {
    const active = engines.filter(e => enabledIds.includes(e.id));
    // 按 settings 里的优先级排序
    return active;
}

// 按优先级依次查，第一个返回 lex 结果的胜出（保留向后兼容）
export async function searchAll(
    word: string,
    enabledIds: string[],
    config?: any,
): Promise<{ engine: DictionaryEngine; result: EngineResult } | null> {
    for (const engine of getEngines(enabledIds)) {
        try {
            const result = await engine.search(word, config);
            if (result && result.meaningHTML) {
                return { engine, result };
            }
        } catch {
            continue;
        }
    }
    return null;
}

/**
 * 多源并行查询：所有启用词典同时查，返回每个有结果的源
 * 用于 PopupSearch / 新版 SearchPanel 展示多源结果
 */
export interface SourceResult {
    engine: DictionaryEngine;
    result: EngineResult;
}

export async function searchAllParallel(
    word: string,
    enabledIds: string[],
    config?: any,
): Promise<SourceResult[]> {
    const activeEngines = getEngines(enabledIds);
    const results = await Promise.allSettled(
        activeEngines.map(async (engine) => {
            try {
                const result = await engine.search(word, config);
                if (result && (result.meaningHTML || result.translationHTML)) {
                    return { engine, result };
                }
            } catch {
                // 该源查询失败，跳过
            }
            return null;
        }),
    );
    return results.filter((r): r is PromiseFulfilledResult<SourceResult> =>
        r.status === "fulfilled" && r.value !== null,
    ).map(r => r.value);
}

export { engines };