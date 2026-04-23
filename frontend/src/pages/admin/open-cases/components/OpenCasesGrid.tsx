import React from 'react';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '../SortableItem';
import { CaseCard } from '../CaseCard';
import styles from '../OpenCases.module.css';

interface OpenCasesGridProps {
    cases: any[];
    sortableItemIds: string[];
    isDragEnabled: boolean;
    getSafeId: (c: any) => string;
    shouldAnimate?: boolean;
    tick?: number;
}

export const OpenCasesGrid: React.FC<OpenCasesGridProps> = ({
    cases,
    sortableItemIds,
    isDragEnabled,
    getSafeId,
    shouldAnimate = true,
    tick = 0
}) => {
    return (
        <SortableContext id="main-container" items={sortableItemIds} strategy={rectSortingStrategy} disabled={!isDragEnabled}>
            <div className={styles.grid}>
                {cases.map((c) => {
                    const id = getSafeId(c);
                    return (
                        <SortableItem key={id} id={id} shouldAnimate={shouldAnimate}>
                            {(dragListeners) => (
                                <CaseCard data={c} isOpen={true} dragHandleProps={dragListeners} tick={tick} />
                            )}
                        </SortableItem>
                    );
                })}
            </div>
        </SortableContext>
    );
};
