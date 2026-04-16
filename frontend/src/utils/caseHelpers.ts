const getCaseId = (c: any): string => {
    return (c.assignmentId || c.id || c.case_number || "").toString();
};

export const mergeWithSavedOrder = (incomingCases: any[], savedOrderIds: (string | number)[]): any[] => {
    if (!savedOrderIds || savedOrderIds.length === 0) return incomingCases;

    const normalizedSavedIds = savedOrderIds.map(id => id.toString());

    const casesMap = new Map<string, any>(
        incomingCases.map(c => [getCaseId(c), c])
    );

    const sortedCases: any[] = [];

    normalizedSavedIds.forEach((id: string) => {
        if (casesMap.has(id)) {
            sortedCases.push(casesMap.get(id));
            casesMap.delete(id);
        }
    });

    const newCases = Array.from(casesMap.values());

    return [...sortedCases, ...newCases];
};