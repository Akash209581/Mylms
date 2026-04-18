const input = "![Image Alt]https://assets.leetcode.com/uploads/2018/10/22/robot_maze.png)";
const regex = /!\[(.*?)\]\s?\(?([^)\s]+)\)?/g;
const output = input.replace(regex, '<img src="$2" alt="$1" />');
console.log(output);

const input2 = "![Alt Text](https://example.com/img.png)";
const output2 = input2.replace(regex, '<img src="$2" alt="$1" />');
console.log(output2);
