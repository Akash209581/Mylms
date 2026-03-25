    const handleSubmit = async () => {
        setSaving(true); setError('')
        try {
            const submitData = {
                ...form,
                topicNames: Array.isArray(form.topicNames) ? form.topicNames.join(', ') : form.topicNames
            }

            // Normalize Matching Pairs
            if (submitData.type === 'MQ' && submitData.matchingPairs) {
                submitData.matchingPairs = submitData.matchingPairs.map((p: any) => ({
                    left: p.left || '',
                    right: p.right || (p.rights && p.rights[0]) || ''
                }));
            }

            // Cleanup: remove empty/irrelevant fields to be super safe
            if (submitData.type !== 'MQ') delete (submitData as any).matchingPairs;
            if (submitData.type !== 'FIB') delete (submitData as any).blanks;
            if (submitData.type !== 'MCQ' && submitData.type !== 'OP') delete (submitData as any).options;
            if (submitData.type !== 'JC') delete (submitData as any).jumbledStatements;
            if (submitData.type !== 'PQ') delete (submitData as any).testCases;
            if (submitData.type !== 'OP' && submitData.type !== 'PQ') {
                delete (submitData as any).codeSnippet;
                delete (submitData as any).expectedOutput;
            }

            const { id: _, questionNumber, createdAt, updatedAt, isActive, opMode, question_number, created_at, updated_at, ...cleanedData } = submitData;

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/question-bank/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(cleanedData),
            })
            if (!res.ok) { const e = await res.json(); setError(e.message || 'Error saving'); return }
            router.push('/dashboard/superadmin/question-bank')
        } catch (e: any) { setError(e.message) }
        finally { setSaving(false) }
    }
