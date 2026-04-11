import { BiPencil } from 'react-icons/bi';
import Swal from 'sweetalert2';
import { timerService } from '../../../features/timer/services/timerService';

export const UnifiedCaseEditor = ({ data, onUpdate }) => {
    const handleEdit = async (e) => {
        if (e) e.stopPropagation();

        const assignmentId = data.assignmentId;
        const initialCaseNumber = data.case_number || '';
        const initialCaseType = data.formType || data.case_type || '';
        const initialOwnerEmail = data.ownerEmail || '';
        const initialEta = data.eta || 0;

        // Correctly handle local time display to avoid timezone jumps
        const startTimeObj = data.start_time ? new Date(data.start_time) : new Date();
        const initialDate = startTimeObj.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
        const initialTime = startTimeObj.getHours().toString().padStart(2, '0') + ':' + 
                          startTimeObj.getMinutes().toString().padStart(2, '0');

        const { value: formValues } = await Swal.fire({
            title: '<span style="color: #FF5722;">Edit Case Assignment</span>',
            html: `
                <div style="display: flex; flex-direction: column; gap: 12px; text-align: left; padding: 10px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <label style="display: block; font-size: 0.75rem; color: #888; margin-bottom: 4px;">Case Number</label>
                            <input id="swal-case-number" type="text" class="swal2-input" value="${initialCaseNumber}" style="margin: 0; width: 100%; height: 35px; background: #222; color: white; border: 1px solid #444; font-size: 0.9rem;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.75rem; color: #888; margin-bottom: 4px;">Manual Type / Classification</label>
                            <input id="swal-case-type" type="text" class="swal2-input" value="${initialCaseType}" style="margin: 0; width: 100%; height: 35px; background: #222; color: white; border: 1px solid #444; font-size: 0.9rem;">
                        </div>
                    </div>
                    
                    <div>
                        <label style="display: block; font-size: 0.75rem; color: #888; margin-bottom: 4px;">Owner Email (Agent)</label>
                        <input id="swal-owner-email" type="email" class="swal2-input" value="${initialOwnerEmail}" style="margin: 0; width: 100%; height: 35px; background: #222; color: white; border: 1px solid #444; font-size: 0.9rem;">
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <label style="display: block; font-size: 0.75rem; color: #888; margin-bottom: 4px;">Start Date</label>
                            <input id="swal-date" type="date" class="swal2-input" value="${initialDate}" style="margin: 0; width: 100%; height: 35px; background: #222; color: white; border: 1px solid #444; font-size: 0.9rem;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.75rem; color: #888; margin-bottom: 4px;">Start Time</label>
                            <input id="swal-time" type="text" class="swal2-input" placeholder="HH:mm" value="${initialTime}" style="margin: 0; width: 100%; height: 35px; background: #222; color: white; border: 1px solid #444; font-size: 0.9rem;">
                        </div>
                    </div>

                    <div>
                        <label style="display: block; font-size: 0.75rem; color: #888; margin-bottom: 4px;">ETA (Minutes)</label>
                        <input id="swal-eta" type="number" class="swal2-input" value="${initialEta}" style="margin: 0; width: 100%; height: 35px; background: #222; color: white; border: 1px solid #444; font-size: 0.9rem;">
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Save Changes',
            confirmButtonColor: '#FF5722',
            background: "#1a1a1a",
            color: "#e2e2e5",
            preConfirm: () => {
                const popup = Swal.getPopup();
                const caseNumber = popup.querySelector('#swal-case-number').value.trim();
                const caseType = popup.querySelector('#swal-case-type').value.trim();
                const ownerEmail = popup.querySelector('#swal-owner-email').value.trim();
                const date = popup.querySelector('#swal-date').value;
                const time = popup.querySelector('#swal-time').value.trim();
                const eta = parseInt(popup.querySelector('#swal-eta').value);

                if (!caseNumber) return Swal.showValidationMessage('Case Number is required');
                if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) return Swal.showValidationMessage('Invalid time format (HH:mm)');

                return { caseNumber, caseType, ownerEmail, date, time, eta };
            }
        });

        if (formValues) {
            const updates = {};

            // Delta Logic: Only add fields that changed
            if (formValues.caseNumber !== initialCaseNumber) updates.caseNumber = formValues.caseNumber;
            if (formValues.caseType !== initialCaseType) updates.caseType = formValues.caseType;
            if (formValues.ownerEmail !== initialOwnerEmail) updates.ownerEmail = formValues.ownerEmail;
            if (formValues.eta !== initialEta) updates.etaMinutes = formValues.eta;

            // Construct the updated ISO string from local input to avoid timezone shifts
            const [year, month, day] = formValues.date.split('-').map(Number);
            const [hours, minutes] = formValues.time.split(':').map(Number);
            
            const updatedDate = new Date(startTimeObj);
            updatedDate.setFullYear(year, month - 1, day);
            updatedDate.setHours(hours, minutes, 0, 0);

            // Compare only up to standard minute precision to avoid accidental updates
            const initialDateMin = new Date(startTimeObj);
            initialDateMin.setSeconds(0, 0);

            if (updatedDate.getTime() !== initialDateMin.getTime()) {
                updates.startTime = updatedDate.toISOString();
            }

            if (Object.keys(updates).length === 0) return;

            try {
                await timerService.updateAssignment(assignmentId, updates);
                if (onUpdate) onUpdate();
            } catch (error) {
                console.error("Failed up update case", error);
                Swal.fire('Error', 'Failed to update case parameters', 'error');
            }
        }
    };

    return (
        <BiPencil
            onClick={handleEdit}
            style={{ cursor: 'pointer', color: 'var(--color-primary)' }}
            title="Edit all case parameters"
        />
    );
};

// Legacy Wrappers to avoid breaking CaseCard immediately
export const StartTimeEditor = ({ data }) => <UnifiedCaseEditor data={data} />;
export const EtaEditor = ({ data }) => <UnifiedCaseEditor data={data} />;
export const CaseInfoEditor = ({ data }) => <UnifiedCaseEditor data={data} />;

