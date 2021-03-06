let canv = document.getElementById("canvas")
const bottom_offset = 50, top_offset = 50, left_offset = 100, right_offset = 50;
var window_height = canv.height, window_width = canv.width;
var xScale = 10, yScale = 5;

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
        power: 15,
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
        charge_power: 20,
        charge_efficiency: 90,
        discharge_power: 20,
        discharge_efficiency: 90,
        storage_marginal_value: 50
    },
    {
        name: "Hydrogen",
        charge_power: 10,
        charge_efficiency: 64,
        discharge_power: 10,
        discharge_efficiency: 50,
        storage_marginal_value: 30
    }
]

function draw()
{
    const canvas = document.querySelector('#canvas');
    if (!canvas.getContext) {
        return;
    }
    const ctx = canvas.getContext('2d');
    window_width = document.getElementById("canvas_container").offsetWidth
    window_height = 0.6 * window_width;
    ctx.canvas.width = window_width;
    ctx.canvas.height = window_height;
    ctx.clearRect(0, 0, window_width, window_height)

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    
    demands = get_demands();
    supplies = get_supplies();
    storages = get_storages();
    let sumSupply = 0.0;
    let sumDemand = 0.0;
    for (let i = 0; i < supplies.length; i++) {
        sumSupply += supplies[i].power;
    }
    for (let i = 0; i < demands.length; i++) {
        sumDemand += demands[i].power;
    }
    let maxPower = Math.max(sumSupply, sumDemand);
    let maxValue = Math.max(demands[0].value, supplies.at(-1).value);
    xScale = (window_width - left_offset - right_offset) / maxPower;
    yScale = (window_height - bottom_offset - top_offset) / maxValue;

    // Draw axis
    ctx.beginPath();
    ctx.moveTo(xx(0),yy(0));
    ctx.lineTo(xx(0), yy(maxValue));
    ctx.moveTo(xx(0), yy(0));
    ctx.lineTo(xx(maxPower), yy(0));
    ctx.stroke();
    
    // Draw grid
    ctx.beginPath();
    ctx.strokeStyle = "lightgrey";
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 10; i++) {
        ctx.moveTo(xx(0), yy(10*i));
        ctx.lineTo(xx(maxPower), yy(10*i));
        ctx.fillText(i*10, 0.8*left_offset, yy(10*i));
    }
    for (let i = 1; i <= 10; i++) {
        ctx.moveTo(xx(i*10), yy(0));
        ctx.lineTo(xx(i*10), yy(100));
        ctx.fillText(i*10, xx(i*10), yy(0) + 0.2*bottom_offset);
    }
    ctx.stroke();

    let [price, volume] = get_price_and_volume(supplies, demands);
    
    draw_surplus(ctx, supplies, demands, price, volume);
    draw_curve(ctx, demands, 'red', 0);
    draw_curve(ctx, supplies, 'green', 100);
    draw_price_volume(ctx, price, volume);
    draw_smv(ctx, storages);

    update_cell_values();
}

function xx(x) {
    return xScale*x+left_offset;
}
function yy(y) {
    return window_height - bottom_offset - yScale*y;
}

function update_slider(obj) {
    rangeSlider = obj.parentNode.children[0]
    rangeSlider.value = obj.value
    draw()
}

function add_row(name, row_name, values, redraw) {
    table = document.getElementById(name);
    var rowCount = table.rows.length;
    var colCount = values.length + 2;
    var row = table.insertRow(rowCount);

    var cell_name = row.insertCell();
    var element_name = document.createElement("input");
    element_name.type = "text";
    element_name.value = row_name;
    cell_name.appendChild(element_name);
    
    for (let j = 0; j < colCount-2; j++) {
        let cell_power = row.insertCell();
        let element_power = document.createElement("input");
        element_power.type = "range";
        element_power.value = values[j];
        element_power.min = 0;
        element_power.max = 100;
        element_power.oninput = draw;
        cell_power.appendChild(element_power);
        let element_power_output = document.createElement("input");
        element_power_output.type = "number";
        element_power_output.className = "form-group col-lg-3";
        element_power_output.value = values[j];
        cell_power.appendChild(element_power_output);

        element_power_output.oninput = function() {update_slider(element_power_output)};
    }
    var cell = row.insertCell();
    var element = document.createElement("button");

    element.className = "btn btn-primary btn-sm";
    element.innerHTML = "x";
    element.onclick = function() {remove_row(name, element)};
    cell.appendChild(element);
    if (redraw) {
        draw();
    }
}

function init_table(supplies, demands, storages) {
    for (let i = 0; i < supplies.length; i++) {
        add_row("supply", supplies[i].name, [supplies[i].power, supplies[i].value], false);
    }
    for (let i = 0; i < demands.length; i++) {
        add_row("demand", demands[i].name, [demands[i].power, demands[i].value], false);
    }
    for (let i = 0; i < storages.length; i++) {
        add_row("storage", storages[i].name, [
            storages[i].charge_power,
            storages[i].charge_efficiency,
            storages[i].discharge_power,
            storages[i].discharge_efficiency,
            storages[i].storage_marginal_value
        ], false);
    }
}

function remove_row(name, button) {
    table = document.getElementById(name);
    table.deleteRow(button.parentNode.parentNode.rowIndex-1);
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
        ctx.lineTo(window_width - right_offset, yy(storages[i].storage_marginal_value));
        ctx.fillText(storages[i].name + " SMV", xx(0), yy(storages[i].storage_marginal_value))
    }
    ctx.stroke();
    ctx.setLineDash([]);
}

function draw_price_volume(ctx, price, volume) {
    ctx.beginPath();
    ctx.font = "12px Arial";
    ctx.strokeStyle = "black";
    ctx.setLineDash([10,10]);
    ctx.moveTo(xx(0), yy(price));
    ctx.lineTo(xx(volume), yy(price));
    ctx.fillText("Price: " + price, left_offset*0.2, yy(price))
    ctx.moveTo(xx(volume), yy(0))
    ctx.lineTo(xx(volume), yy(price));
    ctx.fillText("Volume: " + volume, xx(volume), yy(0) + 0.6 * bottom_offset)
    ctx.stroke();
    ctx.setLineDash([]);
}

function draw_surplus(ctx, supplies, demands, price, volume) {
    // Supplier surplus
    ctx.beginPath();
    ctx.fillStyle = "green";
    ctx.globalAlpha = 0.2;
    
    let acc_volume = 0.0;
    for (let i = 0; i < supplies.length; i++) {
        if (supplies[i].value < price) {
            
            ctx.fillRect(xx(acc_volume), yy(price), xScale*supplies[i].power, yScale*(price - supplies[i].value));
            acc_volume += supplies[i].power;
        }
        else {
            break;
        }
    }

    ctx.stroke();

    // Consumer surplus
    ctx.beginPath();
    ctx.fillStyle = "red";
    ctx.globalAlpha = 0.2;

    acc_volume = 0.0;
    for (let i = 0; i < demands.length; i++) {
        if (demands[i].value > price) {
            
            ctx.fillRect(xx(acc_volume), yy(demands[i].value), xScale*demands[i].power, yScale*(demands[i].value - price));
            acc_volume += demands[i].power;
        }
        else {
            break;
        }
    }

    ctx.stroke();


    ctx.fillStyle = "black";
    ctx.globalAlpha = 1.0;
}

function get_demands()
{
    var demand_table = document.getElementById("demand");
    var demands = [];
    for (let i = 0; i < demand_table.rows.length; i++) {
        row = demand_table.rows[i];
        demands.push({
            name: row.cells[0].children[0].value,
            power: row.cells[1].children[0].value*1.,
            value: row.cells[2].children[0].value*1.
        })
    }
    var storage_table = document.getElementById("storage");
    for (let i = 0; i < storage_table.rows.length; i++) {
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
    
    for (let i = 0; i < supply_table.rows.length; i++) {
        row = supply_table.rows[i];
        supplies.push({
            name: row.cells[0].children[0].value,
            power: row.cells[1].children[0].value*1.,
            value: row.cells[2].children[0].value*1.
        })
    }
    var storage_table = document.getElementById("storage");
    for (let i = 0; i < storage_table.rows.length; i++) {
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
    for (let i = 0; i < storage_table.rows.length; i++) {
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

function get_price_and_volume(supplies, demands) {
    let volume = 0.0;
    let sid = 0, did = 0;

    let s_power = supplies[sid].power
    let s_value = supplies[sid].value
    let d_power = demands[did].power
    let d_value = demands[did].value
    
    // Start loop
    while (true) {
        if (s_power > d_power) {
            volume += d_power;
            s_power -= d_power
            did++;
            if (did == demands.length) {
                return [s_value, volume];
            }
            else {
                d_power = demands[did].power;
                d_value = demands[did].value;
                if (d_value <= s_value) {
                    return [s_value, volume];
                }
            }
        }
        else {
            volume += s_power;
            d_power -= s_power
            sid++;
            if (sid == supplies.length) {
                return [d_value, volume];
            }
            else {
                s_power = supplies[sid].power;
                s_value = supplies[sid].value;
                if (d_value <= s_value) {
                    return [d_value, volume];
                }
            }
        }
    }
}

function update_cell_values() {
    table_names = ["supply", "demand", "storage"]
    for (let t = 0; t < table_names.length; t++)
    {
        var table = document.getElementById(table_names[t])
        for (let i = 0; i < table.rows.length; i++)
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
init_table(init_supplies, init_demands, init_storages);
window.onresize = draw;
draw();