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
}

export const OpenCasesGrid: React.FC<OpenCasesGridProps> = ({
    cases,
    sortableItemIds,
    isDragEnabled,
    getSafeId,
    shouldAnimate = true
}) => {
    return (
        <SortableContext id="main-container" items={sortableItemIds} strategy={rectSortingStrategy} disabled={!isDragEnabled}>
            <div className={styles.grid}>
                {cases.map((c, index) => {
                    const id = getSafeId(c);
                    return (
                        <SortableItem key={id} id={id} index={index} shouldAnimate={shouldAnimate}>
                            {(dragListeners) => (
                                <CaseCard data={c} isOpen={true} dragHandleProps={dragListeners} />
                            )}
                        </SortableItem>
                    );
                })}
            </div>
        </SortableContext>
    );
};
