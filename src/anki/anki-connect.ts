// AnkiConnect HTTP 客户端
// 蒸馏自 Obsidian_to_Anki v3.6.0 (Pseudonium)

import { request } from "obsidian";

const ANKI_PORT = 8765;

interface AnkiConnectRequest {
    action: string;
    version: 6;
    params?: any;
}

async function invoke<T = any>(action: string, params?: any): Promise<T> {
    const body: AnkiConnectRequest = { action, version: 6, params };
    const resp = await request({
        url: `http://127.0.0.1:${ANKI_PORT}`,
        method: "POST",
        body: JSON.stringify(body),
        contentType: "application/json",
    });
    const data = JSON.parse(resp);
    if (data.error) throw new Error(data.error);
    return data.result as T;
}

/** 检查 AnkiConnect 是否可用 */
export async function isAnkiConnectAvailable(): Promise<boolean> {
    try {
        await invoke("modelNames");
        return true;
    } catch {
        return false;
    }
}

/** 获取所有牌组 */
export async function getDeckNames(): Promise<string[]> {
    return invoke("deckNames");
}

/** 创建牌组 */
export async function createDeck(deck: string): Promise<void> {
    await invoke("createDeck", { deck });
}

/** 获取所有笔记类型 */
export async function getModelNames(): Promise<string[]> {
    return invoke("modelNames");
}

/** 获取笔记类型字段 */
export async function getModelFieldNames(modelName: string): Promise<string[]> {
    return invoke("modelFieldNames", { modelName });
}

/** 添加笔记 */
export async function addNote(note: {
    deckName: string;
    modelName: string;
    fields: Record<string, string>;
    tags?: string[];
    options?: { allowDuplicate?: boolean; duplicateScope?: string };
}): Promise<number> {
    return invoke("addNote", { note });
}

/** 更新笔记字段 */
export async function updateNoteFields(note: { id: number; fields: Record<string, string> }): Promise<void> {
    await invoke("updateNoteFields", { note });
}

/** 查找笔记 */
export async function findNotes(query: string): Promise<number[]> {
    return invoke("findNotes", { query });
}

/** 删除笔记 */
export async function deleteNotes(notes: number[]): Promise<void> {
    await invoke("deleteNotes", { notes });
}

/** 获取笔记信息 */
export async function getNotesInfo(notes: number[]): Promise<any[]> {
    return invoke("notesInfo", { notes });
}

/** 批量执行 */
export async function multi(actions: AnkiConnectRequest[]): Promise<any[]> {
    return invoke("multi", { actions });
}