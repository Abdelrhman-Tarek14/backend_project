import React from 'react';
import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { m } from 'framer-motion';
import type { Variants } from 'framer-motion';

/**
 * Entry/Exit variants for cards. 
 * We keep these simple to avoid layout thrashing.
 */
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
    shouldAnimate?: boolean;
    children: ReactNode | ((listeners: ReturnType<typeof useSortable>['listeners']) => ReactNode);
}

/**
 * Optimized SortableItem component.
 * Uses CSS transforms for dragging performance and Framer Motion only for entry animations.
 */
export const SortableItem = React.memo(({ id, children, shouldAnimate = true }: SortableItemProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    // Use CSS.Transform.toString for native browser performance
    // dnd-kit's transform is much more efficient than animating via React state/props
    const style: React.CSSProperties = {
        transform: CSS.Translate.toString(transform),
        transition: isDragging ? 'none' : transition, // Disable transitions while dragging for responsiveness
        opacity: isDragging ? 0.4 : 1,
        touchAction: 'none',
        position: 'relative',
        zIndex: isDragging ? 999 : 'auto',
        willChange: isDragging ? 'transform, opacity' : 'auto', // Hint to browser for GPU acceleration
    };

    return (
        <m.div
            ref={setNodeRef}
            style={style}
            {...attributes}
            // We use Framer Motion only for the initial entrance of the card
            variants={shouldAnimate ? itemVariants : undefined}
            initial={shouldAnimate ? "hidden" : false}
            animate="visible"
            exit="exit"
        >
            {typeof children === 'function' ? children(listeners) : children}
        </m.div>
    );
});

SortableItem.displayName = 'SortableItem';