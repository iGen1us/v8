function f(x)
{
const arr = [1.1, 2.2, 3.3, 4.4, 5.5]; // length => Range(5, 5)
let t = (x == 1 ? 9007199254740992 : 9007199254740989);
// 此时 t => 解释/编译 Range(9007199254740989, 9007199254740992)
t = t + 1 + 1;
/* 此时 t =>
解释：Range(9007199254740991, 9007199254740992)
编译：Range(9007199254740991, 9007199254740994)
*/
t -= 9007199254740989;
/* 此时 t =>
解释：Range(2, 3)
编译：Range(2, 5)
*/
return arr[t];
}
console.log(f(1));
%OptimizeFunctionOnNextCall(f);
console.log(f(1));
