### 如何启动/部署项目
`npm run dev` 启动项目

`npm run build` 打包项目

`npx make-link-win` 创建软连接 **OR** `npx make-install` 复制文件到思源工作区 

如果是 mac 系统，需要使用 `npx make-link` 创建软连接

`npx check-link` 检查状态

手机端如何调试：请使用浏览器并保持和电脑在同一个网络内，端口 50940 访问项目，注意需要打开网络伺服并设置访问授权码
具体地址及端口查看：思源笔记本体 -> 设置 -> 关于 -> 在浏览器上使用

### 如何升级版本号
`update-version` 升级版本号，具体参考 siyuan-plugin-cli 文档