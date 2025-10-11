# 视频源制作

在小猫中一共有两种源:

- **VOD**: 也就是maccms源
- **JS**: JS扩展源

源配置参考:

```ts
interface Iconfig {
  id: string // $UUID 不可重复
  name: string // 名称
  type: 0 | 1 // 0=vod | 1=js
  api: string // vod是接口地址 | js是baseUrl
  nsfw: boolean // 是否是绅士源
  logo?: string // 图标/ignore
  desc?: string // 描述/ignore
  extra?: {
    template?: "t4"
    gfw?: boolean // 是否需要科学上网
    searchLimit?: number // 搜索分页数量
  }
}
```

## VOD

VOD源的制作思路:
1. 搜索 `maccms 采集` 然后找到 `xml|json`(都支持) 采集接口
2. 自己测试一下是否可用
3. 自己编写配置

示例:
```json
{
  "id": "honniuziyuan",
  "name": "红牛资源",
  "api": "https://www.hongniuzy2.com/api.php/provide/vod/at/xml",
  "type": 0
}
```

## JS

JS源的制作思路就是:
1. 搜索 `[电影名称] 在线播放`
2. 试看一下, 看是否能播放, 能播放就开始编写源

现在开始编写源, JS 源的本质上就是

```jsonc
{
  "extra": {
    "js": {
      "category": "$jscode", // 获取分类
      "home": "$jscode", // 首页请求
      "detail": "$jscode", // 详情
      "search": "$jscode", // 搜索
      "parseIframe": "$jscode", // 解析 iframe 获取 m3u8 直链
    }
  }
}
```
这里的 `$jscode` 就是实际上要编写的业务代码, 为了便于了解这里直接给出底层的 `eval`:

```js
(async ()=> {
  const env = {
    get(key, defaultValue) {
      return this.params[key] ?? defaultValue
    },
    baseUrl: `$url`,
    params: $ps,
  };
  $jscode
})()
```

这段根eval代码中:

- $url: 就是 `baseUrl`
- $ps: 就是传递过来的参数
- $jscode: 就是我们的真实业务代码啊, 同上↑

现在我们知道了底层的业务代码, 所以我们开始编写代码(假)

```js
// category/$jscode
const resp = await fetch(`${baseUrl}/categorys`)
return resp.json()
```

这种方式太不好了, 也不好调试, 所以我们提供完善的生态链:

```diff
+ "@types/kitty": "https://gitpkg.vercel.app/waifu-project/movie/JS/types?dev"
+ "kitty": "https://gitpkg.vercel.app/waifu-project/movie/JS/cli?dev"
```

所以让我们真正的来编写JS源吧, 最佳实践:

首先让我们初始化一个 npm 项目:

```bash
npm init -y

# 请使用 bun
# 并添加依赖, 请注意这样安装包 package.json 中依赖会没有name, 请手动添加 :)
bun i https://gitpkg.vercel.app/waifu-project/movie/JS/types?dev
bun i https://gitpkg.vercel.app/waifu-project/movie/JS/cli?dev
```

然后在项目里创建一个目录(必须是目录):

```bash
mkdir -p js
touch js/666tv.ts
```

这里提一嘴, 在小猫JS中内置了 `cheerio` 库, 所以可以直接用来操作 `html`, 我们用一个例子来展示:

> 更具体的请查看 `types/index.d.ts`

```ts
// 请注意, 必须是默认导出的类
// 这里的 Handle 就是我们要实现的接口(types/index.d.ts)
export default class Re666TV implements Handle {
  getConfig() {
    return <Iconfig>{
      id: '666tv', // $uuid
      name: '666TV', // 名称
      api: "https://d1y.movie", // 真实的接口地址
      nsfw: false, // 是否是绅士源
      type: 1, // 常量1
    }
  }
  async getCategory() {
    // 分类一般不会变, 所以直接 return 数组即可
    // 你也同样可以动态获取($fetch->parse->return)
    // PS: 这里没有参数, 即无法通过 env.get() 获取参数
    return <ICategory>[
      { text: '电影', id: "1" },
      { text: '电视剧', id: "2" },
    ]
  }
  async getHome() {
    const cate = env.get('category') // 分类id
    const page = env.get('page') // 页码
    const baseUrl = env.baseUrl // 接口地址
    const url = `${baseUrl}/vodshow/page/${cate}-------${page}--.html` // 拼接成为真实的 url
    const html = await req(url) // 这里的 req 是 types/index.d.ts 中的, 它自带缓存机制, 不要使用 fetch
    const $ = kitty.load(html) // kitty.load 就是 cheerio.load 的别名
    // 然后根据 HTML DOM 元素获取列表
    const result: IMovie[] = $(".m4-list .item").toArray().map<IMovie>(item => {
      const img = $(item).find("img.img")
      const id = $(item).find("a.link").attr("href") ?? ""
      const title = img.attr("alt") ?? ""
      let cover = img.attr("data-src") ?? ""
      if (!!cover && cover.startsWith("//")) {
        cover = `https:${cover}`
      }
      const remark = $(item).find(".tag1").text() ?? ""
      // id: 视频id
      // title: 标题
      // cover: 封面
      // desc: 描述
      // remark: 封面右下角标签
      // playlist: 播放列表, getHome 可以为空
      return { id, title, cover, desc: "", remark, playlist: [] }
    })
    return result
  }
  // 提示: 小猫会自动合并字段, 即如果 getHome() 中已经有了 { cover, title }
  // 那么 getDetail() 就不需要再次返回这两个字段了(因为会合并啊!)
  async getDetail() {
    const id = env.get("movieId") // 视频id
    const url = `${env.baseUrl}${id}`
    const html = await req(url)
    const $ = kitty.load(html)
    // 这里 playlist 就是播放列表
    interface IPlaylist {
      title: string // 源名称
      videos: IPlaylistVideo[] // 视频列表
    }
    interface IPlaylistVideo {
      text: string // 名称
      // 这里的 type 通过 url | id 判断
      // url 存在则为 m3u8
      // id 则为 iframe
      // type: 'm3u8' | 'iframe'
      url?: string
      id?: string
    }
    const playlist: IPlaylist[] = [ /* TODO: impl this */ ]
    return <IMovie>{ id, cover, title, remark, desc, playlist }
  }
  async getSearch() {
    const wd = env.get("keyword") // 搜索关键词
    const page = env.get("page") // 页码
    const url = `${env.baseUrl}/vodsearch/page/${page}--.html`
    // 然后实现这一部分啊!
    return <IMovie[]>[]
  }
  async parseIframe() {
    // 这里的 iframe 解析是当 `IPlaylistVideo.id` 存在时才需要解析的
    const iframe = env.get<string>("iframe") // iframe 地址
    // 然后编写你的逻辑吧
    //
    // ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓
    // 请注意, 当你分析一个源的播放地址源码的时候, 如果源中存在:
    /*
      <div></div><a href="$.html"/><a>
      <script>
        var palyer_aaaa = {
          data: [],"url":"http://x.m3u8" 
        }
      </script>
    */
    // 这样的代码, 那么可以直接使用
    return kitty.utils.getM3u8WithIframe(env)
  }
}
```

太好了, 现在源逻辑已经编写完成了, 现在可以编译成配置文件了

```bash
cd $proj
bunx kitty-parse -o result.json
```

现在你已经可以看到一个 `result.json` 文件, 它就是我们的源配置文件了
现在给它放到网上去, 然后在设置中的视频源管理添加这个源地址就行了

参考:

```bash
# 得到了 http://192.168.1.88:8080/result.json
npx http-server
```

关于如何测试源, 可以参考: [d1y/kitty/utils.ts](https://github.com/d1y/kitty/blob/main/utils.ts)

因为实际上, `global { kitty, req, env }` 这些环境变量在真实的node环境中是不存在的

```bash
cd $proj
wget https://raw.githubusercontent.com/d1y/kitty/refs/heads/main/utils.ts
```

这时候你需要自己初始化一个 `tsc` 配置:

```bash
tsc --init
```

覆盖 `tsconfig.json` 文件:

```json
{
  "compilerOptions": {
    "target": "es2016",
    "module": "commonjs",
    "lib": [ "ESNext", "DOM" ],
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "utils": ["./utils.ts"],
      "utils/*": ["./utils/*"]
    }
  }
}
```

然后就可以在 666TV.ts 中测试了:

```ts
import { kitty, req, createTestEnv } from 'utils'

// TEST
const env = createTestEnv("https://d1y.movie") // 需要跟真实环境一致
const tv = new Re666TV()
;(async ()=> {
  const category = await tv.getCategory()
  env.set("category", category[0].id)
  env.set("page", 2)
  const home = await tv.getHome()
  env.set("keyword", "黑社会")
  const search = await tv.getSearch()
  // env.set("movieId", search[1].id)
  env.set("movieId", home[1].id)
  const detail = await tv.getDetail()
  env.set("iframe", detail[0].playlist[0].id)
  const realM3u8 = await tv.parseIframe()
  debugger
})()
```

**测试完成了之后, 请务必注释掉第一行的 `import`, 否则会导致打包的结果无法正常运行**

## 结尾

**这里有一个最佳实践: [d1y/kitty](https://github.com/d1y/kitty)**

--------------

如果你发现了什么问题, 或者有什么建议, 请在 issue 中提出, 我会尽快回复