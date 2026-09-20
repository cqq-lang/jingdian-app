# 镜点 Jingdian

一个面向摄影爱好者的机位发现与分享 App，界面原型，纯静态页面实现。

在线预览：https://cqq-lang.github.io/jingdian-app/

## 项目简介

出去玩想拍照，常常不知道该去哪儿、什么时间去、怎么构图。镜点把机位信息集中起来，让用户按地点、按题材找机位，看别人的实拍图和拍摄贴士，也能把自己的照片和机位分享出去。

主要功能包括：

- 机位地图，在地图上查看西湖周边的拍摄点，支持筛选、搜索和重新定位
- 机位详情，包含实拍图、最佳拍摄时间、构图建议和费用说明
- 图文步导，从当前位置到机位的路线指引
- 广场，浏览用户分享的照片和帖子，支持点赞、收藏、评论
- 发布，上传照片并关联机位
- 消息与个人中心，包含私信、相册、笔记等

## 页面清单

| 文件 | 说明 |
| --- | --- |
| index.html | 入口，自动跳转到开屏页 |
| splash.html | 开屏页 |
| login.html / register.html | 登录、注册 |
| home.html | 广场首页 |
| hot-spots.html | 热门机位 |
| all-spots.html | 机位列表，带搜索 |
| spot-detail.html | 机位详情 |
| place-detail.html | 地点详情 |
| photo-detail.html | 图片详情 |
| photo-detail-guide.html | 图文步导详情 |
| photo-detail-tips.html | 拍摄技巧详情 |
| navigation.html | 路线导航 |
| map.html | 地图找机位 |
| search.html | 搜索 |
| post-detail.html | 帖子详情 |
| publish.html | 发布 |
| chat.html | 私信对话 |
| message.html | 消息列表 |
| mine.html | 个人中心 |
| album.html | 相册 |


## 技术说明

- 纯静态页面，HTML + CSS + 原生 JavaScript，没有框架，也不需要构建
- 地图部分使用高德地图 JS API 2.0，加载机位标记、定位、搜索
- 所有页面共用 assets/common.css 和 assets/common.js
- 适配移动端尺寸，用浏览器直接打开即可查看，也可以放到 GitHub Pages 上

## 本地运行

因为地图和定位功能需要服务器的环境，建议不要直接双击 html 文件，而是起一个本地服务器。
然后打开 http://localhost:8000/index.html

## 关于高德地图密钥

如果要在自己的环境里跑，需要去 https://console.amap.com 申请一对新的 Web 端密钥填进去，并在控制台里把访问域名加进白名单。
仓库里带的这一对只用于演示，建议不要直接拿去用在正式项目上。

## 已知说明

- 页面里的机位信息、用户、照片均为演示数据
- 定位精度依赖浏览器的安全环境，用 https 访问或 localhost 访问时精度最高，直接用文件打开时只能得到大致的网络定位
- 机位坐标为示意数据，可能与实际位置有少量偏差

## 开发说明

本项目为课程作业，界面与交互由本人设计实现。
