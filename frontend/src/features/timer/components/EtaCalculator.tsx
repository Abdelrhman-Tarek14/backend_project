import React, { useState, memo } from 'react';
import styles from './EtaCalculator.module.css';
import { calculateETA, CASE_TYPES } from '../services/etaLogic'; 
import { BiCalculator, BiReset, BiPencil } from 'react-icons/bi';

export interface EtaData {
    eta: number;
    caseType: string;
    startTime: string;
    finishTime: string;
}

export interface EtaCalculatorProps {
    onDataChange?: (data: EtaData) => void;
}
interface CalculatorInputs {
    caseType: string;
    items: string;
    choices: string;
    descriptions: string;
    images: string;
    areas: string;
    extraBranches: string;
    breakTime: string;
    startTime: string;
}

export const EtaCalculator: React.FC<EtaCalculatorProps> = memo(function EtaCalculator({ onDataChange }) {
    const [inputs, setInputs] = useState<CalculatorInputs>({
        caseType: "",
        items: "",
        choices: "",
        descriptions: "",
        images: "",
        areas: "",
        extraBranches: "",
        breakTime: "",
        startTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
    });

    const [result, setResult] = useState<number>(0);
    const [finishTime, setFinishTime] = useState<string>("");
    const [isEditingTime, setIsEditingTime] = useState<boolean>(false);

    const calculateResult = (newInputs: CalculatorInputs) => {
        const calculated = calculateETA(newInputs); 
        setResult(calculated);
        return calculated;
    };

    const updateFinishTime = (currentResult: number, currentStartTime: string) => {
        if (!currentStartTime) {
            setFinishTime("");
            return "";
        }

        const [hours, minutes] = currentStartTime.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0, 0);

        const finishDate = new Date(startDate.getTime() + currentResult * 60000);
        const fTime = finishDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        setFinishTime(fTime);
        return fTime;
    };

    const notifyChange = (currentResult: number, currentInputs: CalculatorInputs, currentFinishTime: string) => {
        if (onDataChange) {
            onDataChange({
                eta: currentResult,
                caseType: currentInputs.caseType,
                startTime: currentInputs.startTime,
                finishTime: currentFinishTime
            });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const nextInputs = { ...inputs, [name]: value };
        setInputs(nextInputs);
        
        const nextResult = calculateResult(nextInputs);
        const nextFinish = updateFinishTime(nextResult, nextInputs.startTime);
        notifyChange(nextResult, nextInputs, nextFinish);
    };

    const handleReset = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        const resetInputs = {
            caseType: "",
            items: "",
            choices: "",
            descriptions: "",
            images: "",
            areas: "",
            extraBranches: "",
            breakTime: "",
            startTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
        };
        setInputs(resetInputs);
        const nextResult = calculateResult(resetInputs);
        const nextFinish = updateFinishTime(nextResult, resetInputs.startTime);
        notifyChange(nextResult, resetInputs, nextFinish);
    };

    // Helper to determine visibility
    const isFieldVisible = (fieldName: keyof CalculatorInputs): boolean => {
        if (!inputs.caseType) return false;

        const type = inputs.caseType;

        // Universal fields
        if (fieldName === 'breakTime') return true;

        // Group A & B: Full Menu Creation (Excel/PDF/Shared)
        const fullFieldsTypes = [
            "Menu Creation - Excel Menu",
            "Shared Case - Excel Menu - Assigned by SME",
            "Shared Case - Excel Menu - Handover",
            "Menu Creation - JPG/PDF",
            "Shared Case - JPG/PDF - Assigned by SME",
            "Shared Case - JPG/PDF - Handover"
        ];

        if (fullFieldsTypes.includes(type)) {
            return ['items', 'choices', 'descriptions', 'images', 'areas', 'extraBranches'].includes(fieldName);
        }

        // Special Cases
        switch (type) {
            case "Correct Errors":
                return ['items', 'choices', 'descriptions', 'images', 'areas'].includes(fieldName);

            case "Menu Creation - Image Only": 
            case "Images Only": 
                return fieldName === 'images';

            case "Franchise Extension - TMP":
                return fieldName === 'areas';

            case "Branches Creation": 
                return false;

            default:
                return false;
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.titleWrapper}>
                    <BiCalculator className={styles.icon} />
                    <h3>ETA Calculator</h3>
                </div>
                <div className={styles.headerControls}>
                </div>
            </div>

            <div className={styles.calculatorBody}>
                    <div className={styles.topControls}>
                        <div className={styles.selectContainer}>
                            <label className={styles.floatingLabel} htmlFor="caseTypeSelect">Case Type</label>
                            <select
                                id="caseTypeSelect"
                                name="caseType"
                                value={inputs.caseType}
                                onChange={handleChange}
                                className={styles.select}
                            >
                                <option value="" disabled>Select Case Type...</option>
                                {CASE_TYPES.map((type: string) => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.timePillContainer}>
                            <label className={styles.floatingLabel} htmlFor="startTimeInput">
                                {isEditingTime ? "Edit Start Time" : "Finish Time"}
                            </label>
                            <div
                                className={`${styles.timePill} ${isEditingTime ? styles.editing : ""}`}
                                onClick={() => !isEditingTime && setIsEditingTime(true)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        !isEditingTime && setIsEditingTime(true);
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                                aria-label="Edit start time"
                            >
                                {isEditingTime ? (
                                    <input
                                        type="time"
                                        id="startTimeInput"
                                        name="startTime"
                                        value={inputs.startTime}
                                        onChange={handleChange}
                                        onBlur={() => setIsEditingTime(false)}
                                        onKeyDown={(e) => e.key === 'Enter' && setIsEditingTime(false)}
                                        className={styles.timePillInput}
                                        ref={(input) => { if (input && isEditingTime) input.focus(); }}
                                    />
                                ) : (
                                    <div className={styles.finishDisplay}>
                                        <span className={styles.finishLabel}>Ends at</span>
                                        <strong className={styles.finishTimeText}>{finishTime || "--:--"}</strong>
                                        <BiPencil className={styles.editIcon} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={styles.resultsWrapper}>
                            <div className={styles.resultBox}>
                                <span className={styles.resultLabel}>ESTIMATED TIME</span>
                                <div className={styles.resultValue}>
                                    <span>{result}</span>
                                    <span className={styles.mins}>min</span>
                                </div>
                            </div>

                            <button onClick={handleReset} className={styles.resetBtn} title="Reset">
                                <BiReset />
                            </button>
                        </div>
                    </div>

                    <div className={styles.inputsGrid}>
                        {isFieldVisible('items') && (
                            <div className={styles.miniInputWrapper}>
                                <label htmlFor="itemsInput">Items</label>
                                <input id="itemsInput" type="number" name="items" value={inputs.items} onChange={handleChange} placeholder="0" />
                            </div>
                        )}
                        {isFieldVisible('choices') && (
                            <div className={styles.miniInputWrapper}>
                                <label htmlFor="choicesInput">Choices</label>
                                <input id="choicesInput" type="number" name="choices" value={inputs.choices} onChange={handleChange} placeholder="0" />
                            </div>
                        )}
                        {isFieldVisible('descriptions') && (
                            <div className={styles.miniInputWrapper}>
                                <label htmlFor="descriptionsInput">Descriptions</label>
                                <input id="descriptionsInput" type="number" name="descriptions" value={inputs.descriptions} onChange={handleChange} placeholder="0" />
                            </div>
                        )}
                        {isFieldVisible('images') && (
                            <div className={styles.miniInputWrapper}>
                                <label htmlFor="imagesInput">Images</label>
                                <input id="imagesInput" type="number" name="images" value={inputs.images} onChange={handleChange} placeholder="0" />
                            </div>
                        )}
                        {isFieldVisible('areas') && (
                            <div className={styles.miniInputWrapper}>
                                <label htmlFor="areasInput">Areas</label>
                                <input id="areasInput" type="number" name="areas" value={inputs.areas} onChange={handleChange} placeholder="0" />
                            </div>
                        )}
                        {isFieldVisible('extraBranches') && (
                            <div className={styles.miniInputWrapper} style={{ display: 'none' }}>
                                <label htmlFor="extraBranchesInput">Branches</label>
                                <input id="extraBranchesInput" type="number" name="extraBranches" value={inputs.extraBranches} onChange={handleChange} placeholder="0" />
                            </div>
                        )}

                        <div className={styles.miniInputWrapper}>
                            <label htmlFor="breakTimeInput">Break (Mins)</label>
                            <input id="breakTimeInput" type="number" name="breakTime" value={inputs.breakTime} onChange={handleChange} placeholder="0" />
                        </div>
                    </div>
                </div>
        </div>
    );
});