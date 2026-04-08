
const getCaseId = (c) => {
    return (c.assignmentId || c.id || c.case_number).toString();
};

export const mergeWithSavedOrder = (incomingCases, savedOrderIds) => {
    if (!savedOrderIds || savedOrderIds.length === 0) return incomingCases;

    const normalizedSavedIds = savedOrderIds.map(id => id.toString());

    const casesMap = new Map(incomingCases.map(c => [getCaseId(c), c]));

    const sortedCases = [];

    normalizedSavedIds.forEach(id => {
        if (casesMap.has(id)) {
            sortedCases.push(casesMap.get(id));
            casesMap.delete(id);
        }
    });

    const newCases = Array.from(casesMap.values());

    return [...sortedCases, ...newCases];
};