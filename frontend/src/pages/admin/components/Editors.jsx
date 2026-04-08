import { useState, useEffect } from 'react';
import { BiPencil } from 'react-icons/bi';
import Swal from 'sweetalert2';
import { timerService } from '../../../features/timer/services/timerService';

export const StartTimeEditor = ({ caseId, currentTimestamp, startTime, editorRole = 'admin' }) => {
    const handleEdit = async (e) => {
        e.stopPropagation();
        if (!caseId) return;

        // If no startTime yet, use current time as default
        const now = new Date();
        const defaultDate = startTime && !isNaN(startTime.getTime())
            ? startTime.toISOString().split('T')[0]
            : now.toISOString().split('T')[0];
        const defaultTime = startTime && !isNaN(startTime.getTime())
            ? startTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
            : now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

        const { value: formValues } = await Swal.fire({
            title: startTime ? 'Edit Start Time' : 'Set Start Time',
            html: `
                <div style="display: flex; flex-direction: column; gap: 15px; text-align: left;">
                    <div>
                        <label style="display: block; font-size: 0.8rem; color: #666; margin-bottom: 5px;">Start Date</label>
                        <input id="swal-date" type="date" class="swal2-input" value="${defaultDate}" style="margin: 0; width: 100%; box-sizing: border-box; background: #222; color: white; border: 1px solid #444;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.8rem; color: #666; margin-bottom: 5px;">Start Time (HH:mm)</label>
                        <input id="swal-time" type="text" class="swal2-input" placeholder="HH:mm" value="${defaultTime}" 
                            oninput="this.value = this.value.replace(/\\s/g, '')"
                            style="margin: 0; width: 100%; box-sizing: border-box; background: #222; color: white; border: 1px solid #444;">
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#FF5722',
            background: "#1a1a1a",
            color: "#e2e2e5",
            preConfirm: () => {
                const popup = Swal.getPopup();
                const dateVal = popup.querySelector('#swal-date').value;
                const timeVal = popup.querySelector('#swal-time').value.trim().replace(/\s/g, '');

                if (!dateVal || !timeVal) {
                    Swal.showValidationMessage('Please fill both fields');
                    return false;
                }

                if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(timeVal)) {
                    Swal.showValidationMessage('Invalid time format (HH:mm)');
                    return false;
                }

                return { date: dateVal, time: timeVal };
            }
        });

        if (formValues) {
            const fullISOStr = `${formValues.date} ${formValues.time}:00`;
            try {
                await timerService.updateActiveCaseStartTime(caseId, fullISOStr, null, editorRole);
            } catch (error) {
                console.error("Failed to update time", error);
            }
        }
    };

    const formattedDate = startTime && !isNaN(startTime.getTime())
        ? `${startTime.getDate().toString().padStart(2, '0')}/${(startTime.getMonth() + 1).toString().padStart(2, '0')}`
        : null;
    const formattedTime = startTime && !isNaN(startTime.getTime())
        ? startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
        : null;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={handleEdit}>
            {formattedDate && formattedTime ? (
                <>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{formattedDate} - {formattedTime}</span>
                    <BiPencil style={{ fontSize: '0.9rem', color: 'var(--color-primary)' }} />
                </>
            ) : (
                <span style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#FF9800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                }}>
                    <BiPencil style={{ fontSize: '0.9rem' }} />
                    Set Start Time
                </span>
            )}
        </div>
    );
};

export const EtaEditor = ({ caseId, currentEta }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempEta, setTempEta] = useState(currentEta);

    useEffect(() => {
        setTempEta(currentEta);
    }, [currentEta]);

    const handleSave = async () => {
        if (!caseId) return setIsEditing(false);
        try {
            await timerService.updateActiveCaseEta(caseId, tempEta);
        } catch (error) {
            console.error("Failed to update ETA", error);
        } finally {
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <input
                    type="number"
                    style={{ width: '50px', padding: '2px 4px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    value={tempEta}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setTempEta(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    autoFocus
                />
                <span style={{ fontSize: '0.8rem' }}>min</span>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => setIsEditing(true)}>
            <span>{currentEta > 0 ? `${currentEta} min` : 'The ETA Form Not Submitted'}</span>
            <BiPencil style={{ fontSize: '0.9rem', color: 'var(--color-primary)' }} />
        </div>
    );
};

export const CaseInfoEditor = ({ caseId, currentType }) => {
    const handleEdit = async (e) => {
        e.stopPropagation();
        if (!caseId) return;

        const { value: formValues } = await Swal.fire({
            title: 'Edit Case Info',
            html: `
                <div style="display: flex; flex-direction: column; gap: 15px; text-align: left;">
                    <div>
                        <label style="display: block; font-size: 0.8rem; color: #666; margin-bottom: 5px;">Case Type</label>
                        <input id="swal-case-type" type="text" class="swal2-input" value="${currentType || ''}" style="margin: 0; width: 100%; box-sizing: border-box; background: #222; color: white; border: 1px solid #444;">
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#FF5722',
            background: "#1a1a1a",
            color: "#e2e2e5",
            preConfirm: () => {
                const popup = Swal.getPopup();
                const type = popup.querySelector('#swal-case-type').value.trim();

                if (!type) {
                    Swal.showValidationMessage('Case Type is required');
                    return false;
                }
                return { type };
            }
        });

        if (formValues) {
            const finalType = formValues.type.trim();

            try {
                if (finalType !== currentType) {
                    await timerService.updateActiveCaseType(caseId, finalType);
                }
            } catch (error) {
                console.error("Failed to update case info", error);
            }
        }
    };

    return (
        <BiPencil
            onClick={handleEdit}
            style={{
                cursor: 'pointer',
                fontSize: '1rem',
                color: 'var(--color-primary)',
                opacity: 0.7
            }}
            title="Edit Case Type"
        />
    );
};
