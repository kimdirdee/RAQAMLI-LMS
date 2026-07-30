const API_BASE = '/api';

function saveTest(test) {
    return fetch(`${API_BASE}/tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test)
    }).then(res => res.json()).then(data => data.test);
}

function getTest(id) {
    return fetch(`${API_BASE}/tests/${id}`)
        .then(res => res.json())
        .then(data => {
            if (data.error) return null;
            return data;
        });
}

function getAllTests() {
    return fetch(`${API_BASE}/tests`)
        .then(res => res.json())
        .then(data => {
            if (data.error) return [];
            return data;
        });
}

function deleteTest(id) {
    return fetch(`${API_BASE}/tests/${id}`, {
        method: 'DELETE'
    }).then(res => res.json()).then(data => data.success);
}

// Result storage
function saveResult(resData) {
    return fetch(`${API_BASE}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resData)
    }).then(res => res.json());
}

function getResultsForTest(testId) {
    return fetch(`${API_BASE}/results/${testId}`)
        .then(res => res.json())
        .then(data => {
            if (data.error) return [];
            return data;
        });
}

// Calculate Rating for Teacher
function getTeacherRating(teacherName) {
    return fetch(`${API_BASE}/rating/${encodeURIComponent(teacherName)}`)
        .then(res => res.json())
        .then(data => data.rating || 0);
}
