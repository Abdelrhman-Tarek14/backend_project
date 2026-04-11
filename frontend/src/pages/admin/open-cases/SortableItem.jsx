import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';

const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { type: "spring", stiffness: 300, damping: 25 }
    }
};

export const SortableItem = ({ id, children }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition, // Let dnd-kit handle the sorting transition natively
        opacity: isDragging ? 0.6 : 1,
        touchAction: 'none',
        position: 'relative',
        zIndex: isDragging ? 999 : 'auto'
    };

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            {...attributes}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            // layout prop removed to prevent fighting with dnd-kit transitions, yielding 60fps
        >
            {typeof children === 'function' ? children(listeners) : children}
        </motion.div>
    );
};