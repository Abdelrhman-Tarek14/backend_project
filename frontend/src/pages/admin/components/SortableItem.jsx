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
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition, // Disable dnd-kit transition during drag for framer-motion to take over
        opacity: isDragging ? 0.5 : 1,
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
            layout // Enable layout animations for smoother grid reordering
        >
            {typeof children === 'function' ? children(listeners) : children}
        </motion.div>
    );
};