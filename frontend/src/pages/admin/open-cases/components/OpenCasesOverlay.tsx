import React from 'react';
import { DragOverlay } from '@dnd-kit/core';
import { CaseCard } from '../CaseCard';

interface OpenCasesOverlayProps {
    activeId: string | number | null;
    cases: any[];
    getSafeId: (c: any) => string;
    tick?: number;
}

export const OpenCasesOverlay: React.FC<OpenCasesOverlayProps> = ({
    activeId,
    cases,
    getSafeId,
    tick = 0
}) => {
    if (!activeId) return null;

    const activeCase = cases.find(c => getSafeId(c) === activeId);
    
    return (
        <DragOverlay dropAnimation={null}>
            {activeCase ? (
                <div style={{ 
                    opacity: 0.95, 
                    cursor: 'grabbing', 
                    transform: 'scale(1.05)',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
                    borderRadius: '16px',
                    pointerEvents: 'none'
                }}>
                    <CaseCard data={activeCase} isOpen={true} tick={tick} />
                </div>
            ) : null}
        </DragOverlay>
    );
};
