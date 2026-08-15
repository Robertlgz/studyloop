<template>
    <div class="dict-item">
        <div class="dict-header">
            <span class="dict-name">{{ name }}</span>
            <span v-if="loading" class="dict-loading">加载中...</span>
        </div>
        <div v-if="!loading" class="dict-body">
            <slot />
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    name: string;
    loading: boolean;
    id: string;
}>();
</script>

<style scoped>
.dict-item {
    margin-bottom: 8px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    overflow: hidden;
}
.dict-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 8px;
    background: var(--background-secondary);
    font-size: 0.85em;
    font-weight: 600;
}
.dict-loading {
    color: var(--text-muted);
    font-size: 0.8em;
}
.dict-body {
    padding: 4px 8px;
    font-size: 0.9em;
}
</style>