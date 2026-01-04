export interface DaevanionEffect {
    desc: string;
}

export interface DaevanionNode {
    boardId: number;
    nodeId: number;
    name: string;
    row: number; // 1-15
    col: number; // 1-15
    grade: 'Common' | 'Rare' | 'Unique' | 'Legend' | 'None' | 'Start';
    type: 'Stat' | 'SkillLevel' | 'None' | 'Start';
    icon: string;
    effectList: DaevanionEffect[];
    open: number; // 0 or 1
}

export interface DaevanionBoardResponse {
    nodeList: DaevanionNode[];
    openStatEffectList: DaevanionEffect[];
    openSkillEffectList: DaevanionEffect[];
}
