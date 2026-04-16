import { useState } from 'react';

export function useAppControls() {
    // Default controls since the backend currently doesn't manage these globally
    const [controls] = useState({
        allow_delete_case: true,
        allow_complete_case: true,
        allow_edit_eta: true,
        allow_edit_start_time: true,
        allow_agent_edit_start_time: true
    });

    // In the future, this could fetch from /api/settings or similar
    // For now, we return the defaults to decouple from Firebase
    
    return controls;
}
