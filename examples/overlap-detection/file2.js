// File 2: Contains similar patterns

function transformData(data) {
    const output = [];
    for (let i = 0; i < data.length; i++) {
        if (data[i].active) {
            output.push(data[i].value * 2);
        }
    }
    return output;
}