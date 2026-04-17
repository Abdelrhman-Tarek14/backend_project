import React from 'react';
import { DragOverlay } from '@dnd-kit/core';
import { CaseCard } from '../CaseCard';

interface OpenCasesOverlayProps {
    activeId: string | number | null;
    cases: any[];
    getSafeId: (c: any) => string;
}

export const OpenCasesOverlay: React.FC<OpenCasesOverlayProps> = ({
    activeId,
    cases,
    getSafeId
}) => {
    if (!activeId) return null;

    const activeCase = cases.find(c => getSafeId(c) === activeId);
    
    return (
        <DragOverlay dropAnimation={null}>
            {activeCase ? (
                <div style={{ opacity: 0.9, cursor: 'grabbing', transform: 'scale(1.02)' }}>
                    <CaseCard data={activeCase} isOpen={true} />
                </div>
            ) : null}
        </DragOverlay>
    );
};
