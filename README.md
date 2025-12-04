 <!--
 * @Author: yl_li
 * @Date: 2024-08-20
 * @LastEditors: yl_li
 * @LastEditTime: 2024-10-25
 * @description: 
-->
## 启动

执行 `vite build` 命令，打包项目

项目提供了参数 `--d`

`--d` 指定打包环境为 `dev` 环境，输出目录指向 `SIYUAN_WORKSPACE`，同时关闭代码混淆


#### 热部署策略
支持热部署，但仅适用于 `src` 下的代码文件，修改配置文件需重启项目

#### 插件重新加载策略
在热部署生效前提下，监听器会回调 `siyuan` 的接口关闭并重启本插件，以确保插件被重新加载，如果你的文件很多，可能性能会很差。

如果该功能不生效，请检查 `vite.config.ts` 中 `BASRE_URL` 是否配置正确