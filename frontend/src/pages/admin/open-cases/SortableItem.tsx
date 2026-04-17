import React from 'react';
import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { m } from 'framer-motion';
import type { Variants } from 'framer-motion';

const itemVariants: Variants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { type: "spring", stiffness: 300, damping: 25 }
    }
};

export interface SortableItemProps {
    id: string | number;
    children: ReactNode | ((listeners: ReturnType<typeof useSortable>['listeners']) => ReactNode);
}

export const SortableItem = ({ id, children }: SortableItemProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style: React.CSSProperties = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        touchAction: 'none',
        position: 'relative',
        zIndex: isDragging ? 999 : 'auto'
    };

    return (
        <m.div
            ref={setNodeRef}
            style={style}
            {...attributes}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
        >
            {typeof children === 'function' ? children(listeners) : children}
        </m.div>
    );
};