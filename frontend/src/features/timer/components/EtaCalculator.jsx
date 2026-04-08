import React, { useState, useEffect, memo } from 'react';
import styles from './EtaCalculator.module.css';
import { calculateETA, CASE_TYPES } from '../services/etaLogic';
import { BiCalculator, BiReset, BiPencil } from 'react-icons/bi';
import { RiArrowDownDoubleFill, RiArrowUpDoubleFill } from 'react-icons/ri';

export const EtaCalculator = memo(function EtaCalculator({ onDataChange }) {
    const [inputs, setInputs] = useState({
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

    const [result, setResult] = useState(0);
    const [finishTime, setFinishTime] = useState("");
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isEditingTime, setIsEditingTime] = useState(false);

    // Notify parent of changes if prop exists
    useEffect(() => {
        if (onDataChange) {
            onDataChange({
                eta: result,
                caseType: inputs.caseType,
                startTime: inputs.startTime,
                finishTime: finishTime
            });
        }
    }, [result, inputs.caseType, inputs.startTime, finishTime, onDataChange]);

    // Calculate ETA whenever inputs change
    useEffect(() => {
        const calculated = calculateETA(inputs);
        setResult(calculated);
    }, [inputs.caseType, inputs.items, inputs.choices, inputs.descriptions, inputs.images, inputs.areas, inputs.extraBranches, inputs.breakTime]);

    // Calculate Finish Time whenever result or startTime changes
    useEffect(() => {
        if (!inputs.startTime) {
            setFinishTime("");
            return;
        }

        const [hours, minutes] = inputs.startTime.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0, 0);

        const finishDate = new Date(startDate.getTime() + result * 60000);
        setFinishTime(finishDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
    }, [result, inputs.startTime]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setInputs(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleReset = (e) => {
        e.stopPropagation(); // Prevent header click propagation if any
        setInputs({
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
    };

    // Helper to determine visibility
    const isFieldVisible = (fieldName) => {
        if (!inputs.caseType) return false;

        const type = inputs.caseType;

        // Universal fields
        if (fieldName === 'breakTime') return true;

        // Group A & B: Full Menu Creation (Excel/PDF/Shared)
        // These types require ALL standard fields
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
                // Uses everything EXCEPT Extra Branches
                return ['items', 'choices', 'descriptions', 'images', 'areas'].includes(fieldName);

            case "Menu Creation - Image Only": // Legacy name check?
            case "Images Only": // Name from etaLogic.js CASE_TYPES
                return fieldName === 'images';

            case "Franchise Extension - TMP":
                return fieldName === 'areas';

            case "Branches Creation": // Not in etaLogic CASE_TYPES list but present in previous code?
                // etaLogic has "Franchise Extension", maybe "Branches Creation" was a UI name?
                // Looking at etaLogic.js, there is NO "Branches Creation". 
                // There is "Franchise Extension - TMP" (uses areas) and "Franchise Extension - OD" (fixed).
                // I will stick to what is in CASE_TYPES array in etaLogic usage.
                return false;

            default:
                // Fixed time cases (Copy Menu, Dine-out, OD) have no inputs other than breakTime
                return false;
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.titleWrapper}>
                    {/* Icon can be kept or removed depending on preference. 
                        With the bar, the icon might be too much, but let's keep it for now as it adds 'calculator' context. 
                        If the user wants EXACTLY like history, we might remove it. 
                        Let's keep it but make sure the bar is on the H3. */}
                    <BiCalculator className={styles.icon} />
                    <h3>ETA Calculator</h3>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={styles.collapseBtn}
                        title={isCollapsed ? "Expand" : "Collapse"}
                    >
                        {isCollapsed ? (
                            <>
                                <span>Expand</span>
                                <RiArrowDownDoubleFill />
                            </>
                        ) : (
                            <>
                                <span>Collapse</span>
                                <RiArrowUpDoubleFill />
                            </>
                        )}
                    </button>
                </div>
                <div className={styles.headerControls}>
                    {/* Reset Button Moved to Body as requested */}
                </div>
            </div>

            {!isCollapsed && (
                <div className={styles.calculatorBody}>
                    {/* Top Row: Dropdown, Start Time, Result/Finish, Reset */}
                    <div className={styles.topControls}>
                        <div className={styles.selectContainer}>
                            <label className={styles.floatingLabel}>Case Type</label>
                            <select
                                id="caseTypeSelect"
                                name="caseType"
                                value={inputs.caseType}
                                onChange={handleChange}
                                className={styles.select}
                            >
                                <option value="" disabled>Select Case Type...</option>
                                {CASE_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.timePillContainer}>
                            <label className={styles.floatingLabel}>
                                {isEditingTime ? "Edit Start Time" : "Finish Time"}
                            </label>
                            <div
                                className={`${styles.timePill} ${isEditingTime ? styles.editing : ""}`}
                                onClick={() => !isEditingTime && setIsEditingTime(true)}
                            >
                                {isEditingTime ? (
                                    <input
                                        type="time"
                                        name="startTime"
                                        value={inputs.startTime}
                                        onChange={handleChange}
                                        onBlur={() => setIsEditingTime(false)}
                                        onKeyDown={(e) => e.key === 'Enter' && setIsEditingTime(false)}
                                        className={styles.timePillInput}
                                        autoFocus
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

                    {/* Bottom Row: Inputs Grid */}
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

                        {/* Break Time included in grid flow */}
                        <div className={styles.miniInputWrapper}>
                            <label htmlFor="breakTimeInput">Break (Mins)</label>
                            <input id="breakTimeInput" type="number" name="breakTime" value={inputs.breakTime} onChange={handleChange} placeholder="0" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});
