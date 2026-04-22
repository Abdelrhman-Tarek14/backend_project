import React from 'react';
import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { m } from 'framer-motion';
import type { Variants } from 'framer-motion';

const itemVariants: Variants = {
    hidden: { opacity: 0, scale: 0.96, y: 10 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { 
            type: "spring", 
            stiffness: 400, 
            damping: 30,
            mass: 0.8
        }
    },
    exit: {
        opacity: 0,
        scale: 0.98,
        transition: { duration: 0.1 }
    }
};

export interface SortableItemProps {
    id: string | number;
    index?: number;
    shouldAnimate?: boolean;
    children: ReactNode | ((listeners: ReturnType<typeof useSortable>['listeners']) => ReactNode);
}

export const SortableItem = React.memo(({ id, children, index = 0, shouldAnimate = true }: SortableItemProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        isDragging
    } = useSortable({ id });

    const style: React.CSSProperties = {
        opacity: isDragging ? 0.4 : 1,
        touchAction: 'none',
        position: 'relative',
        zIndex: isDragging ? 999 : 'auto',
    };

    return (
        <m.div
            ref={setNodeRef}
            style={style}
            {...attributes}
            animate={{
                x: transform?.x ?? 0,
                y: transform?.y ?? 0,
                opacity: isDragging ? 0.4 : 1,
                scale: 1,
            }}
            transition={{
                x: { type: "spring", stiffness: 500, damping: 50, mass: 1 },
                y: { type: "spring", stiffness: 500, damping: 50, mass: 1 },
                layout: { type: "spring", stiffness: 400, damping: 40, mass: 0.8 },
                opacity: { 
                    duration: shouldAnimate ? 0.2 : 0, 
                    delay: (shouldAnimate && !isDragging) ? Math.min(index * 0.03, 0.3) : 0 
                },
                scale: { 
                    duration: shouldAnimate ? 0.2 : 0, 
                    delay: (shouldAnimate && !isDragging) ? Math.min(index * 0.03, 0.3) : 0 
                }
            }}
            variants={shouldAnimate ? itemVariants : undefined}
            initial={shouldAnimate ? "hidden" : false}
            layout="position"
        >
            {typeof children === 'function' ? children(listeners) : children}
        </m.div>
    );
});