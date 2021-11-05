let canv = document.getElementById("canvas")
const bottom_offset = 50, side_offset = 50, window_height = canv.height, window_width = canv.width;

let init_supplies = [
    {
        name: "VRES",
        power: 20,
        value: 0
    },
    {
        name: "Import",
        power: 10,
        value: 20
    }
]
let init_demands = [
    {
        name: "Demand",
        power: 10,
        value: 100
    },
    {
        name: "Export",
        power: 10,
        value: 10
    }
]
let init_storages = [
    {
        name: "Battery",
        charge_power: 10,
        charge_efficiency: 90,
        discharge_power: 10,
        discharge_efficiency: 90,
        storage_marginal_value: 50
    }
]

function draw()
{
    const canvas = document.querySelector('#canvas');
    if (!canvas.getContext) {
        return;
    }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, window_width, window_height)

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    
    // Draw axis
    ctx.beginPath();
    ctx.moveTo(xx(0),yy(0));
    ctx.lineTo(xx(0), yy(500));
    ctx.moveTo(xx(0), yy(0));
    ctx.lineTo(xx(500), yy(0));
    ctx.stroke();

    // Draw grid
    ctx.beginPath();
    ctx.strokeStyle = "lightgrey";
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 10; i++) {
        ctx.moveTo(xx(0), yy(10*i));
        ctx.lineTo(xx(100), yy(10*i));
        ctx.fillText(i*10, xx(-2), yy(10*i));
    }
    for (let i = 1; i <= 10; i++) {
        ctx.moveTo(xx(i*10), yy(0));
        ctx.lineTo(xx(i*10), yy(100));
        ctx.fillText(i*10, xx(i*10), yy(-2));
    }
    ctx.stroke();

    demands = get_demands();
    draw_curve(ctx, demands, 'red', 0);

    supplies = get_supplies()
    draw_curve(ctx, supplies, 'green', 100);

    storages = get_storages();
    draw_smv(ctx, storages);
    update_cell_values()
}

function xx(x) {
    return 10*x+side_offset;
}
function yy(y) {
    return window_height - bottom_offset - 5*y;
}

function add_row(name) {
    table = document.getElementById(name);
    var rowCount = table.rows.length;
    var colCount = table.rows[0].cells.length;
    var row = table.insertRow(rowCount);

    var cell_name = row.insertCell();
    var element_name = document.createElement("input");
    element_name.type = "text";
    element_name.value = "New_"+name;
    cell_name.appendChild(element_name);
    
    for (let j = 1; j < colCount-1; j++) {
        var cell_power = row.insertCell();
        var element_power = document.createElement("input");
        element_power.type = "range";
        element_power.value = 10;
        element_power.min = 0;
        element_power.max = 100;
        element_power.oninput = draw;
        cell_power.appendChild(element_power);
        var element_power_output = document.createElement("output");
        element_power_output.value = 10;
        cell_power.appendChild(element_power_output);
    }
    var cell = row.insertCell();
    var element = document.createElement("button");
    element.innerHTML = "Remove";
    element.onclick = function() {remove_row(name, element)};
    cell.appendChild(element);
    draw();
}

function remove_row(name, button) {
    table = document.getElementById(name);
    table.deleteRow(button.parentNode.parentNode.rowIndex);
    draw();
}

function draw_curve(ctx, objects, color, end_value)
{
    ctx.beginPath();
    ctx.font = "12px Arial";
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.moveTo(xx(0), yy(objects[0].value))
    x_offset = 0.0
    for (let i = 0; i < objects.length; i++) {
        ctx.lineTo(xx(x_offset + objects[i].power), yy(objects[i].value));
        ctx.fillText(objects[i].name, xx(x_offset), yy(objects[i].value))
        if (i + 1 == objects.length) {
            ctx.lineTo(xx(x_offset + objects[i].power), yy(end_value));
        }
        else {
            ctx.lineTo(xx(x_offset + objects[i].power), yy(objects[i+1].value));
        }
        x_offset += objects[i].power;
    }
    ctx.stroke();
}

function draw_smv(ctx, storages) {
    ctx.beginPath();
    ctx.font = "12px Arial";
    ctx.strokeStyle = "blue";
    ctx.setLineDash([10,10]);
    for (let i = 0; i < storages.length; i++) {
        ctx.moveTo(xx(0), yy(storages[i].storage_marginal_value));
        ctx.lineTo(xx(window_width), yy(storages[i].storage_marginal_value));
        ctx.fillText(storages[i].name + " SMV", xx(0), yy(storages[i].storage_marginal_value))
    }
    ctx.stroke();
    ctx.setLineDash([]);
}

function get_demands()
{
    var demand_table = document.getElementById("demand");
    var demands = [];
    for (let i = 1; i < demand_table.rows.length; i++) {
        row = demand_table.rows[i];
        demands.push({
            name: row.cells[0].children[0].value,
            power: row.cells[1].children[0].value*1.,
            value: row.cells[2].children[0].value*1.
        })
    }
    var storage_table = document.getElementById("storage");
    for (let i = 1; i < storage_table.rows.length; i++) {
        row = storage_table.rows[i];
        demands.push({
            name: row.cells[0].children[0].value,
            power: row.cells[1].children[0].value*1.,
            value: row.cells[5].children[0].value * (row.cells[2].children[0].value / 100)
        })
    }

    demands.sort(compare_objects).reverse();
    return demands;
}

function get_supplies()
{
    var supply_table = document.getElementById("supply");
    var supplies = [];
    
    for (let i = 1; i < supply_table.rows.length; i++) {
        row = supply_table.rows[i];
        supplies.push({
            name: row.cells[0].children[0].value,
            power: row.cells[1].children[0].value*1.,
            value: row.cells[2].children[0].value*1.
        })
    }
    var storage_table = document.getElementById("storage");
    for (let i = 1; i < storage_table.rows.length; i++) {
        row = storage_table.rows[i];
        supplies.push({
            name: row.cells[0].children[0].value,
            power: row.cells[3].children[0].value*1.,
            value: row.cells[5].children[0].value / (row.cells[4].children[0].value / 100)
        })
    }

    supplies.sort(compare_objects);
    return supplies;
}

function get_storages() {
    var storages = []
    var storage_table = document.getElementById("storage");
    for (let i = 1; i < storage_table.rows.length; i++) {
        row = storage_table.rows[i];
        storages.push({
            name: row.cells[0].children[0].value,
            charge_power: row.cells[1].children[0].value*1.,
            charge_efficiency: row.cells[2].children[0].value*1.,
            discharge_power: row.cells[3].children[0].value*1.,
            discharge_efficiency: row.cells[4].children[0].value*1.,
            storage_marginal_value: row.cells[5].children[0].value*1.
        })
    }

    return storages;
}

function update_cell_values() {
    table_names = ["supply", "demand", "storage"]
    for (let t = 0; t < table_names.length; t++)
    {
        var table = document.getElementById(table_names[t])
        for (let i = 1; i < table.rows.length; i++)
        {
            row = table.rows[i]
            for (let j = 1; j < row.cells.length-1; j++)
            {
                cell = row.cells[j]
                cell.children[1].value = cell.children[0].value
            }
        }
    }
}

function compare_objects(a, b) {
    if (a.value > b.value) return 1;
    if (a.value < b.value) return -1;
    return 0;
}
draw()