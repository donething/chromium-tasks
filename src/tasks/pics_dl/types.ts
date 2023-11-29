// 图集下载状态
export namespace pstatus {
  // 图集下载状态
  export type StatusType = {
    total: number
    done: number
    skip: number
    fail: number
  }

  // 图集下载的总状态
  export type TotalCount = {
    fail: number,
    skip: number
  }
}

// 图集信息
export namespace pinfo {
  // 单个图集，将保存到本地 json 文件中，可传给服务端下载
  export type Album = {
    // 所在的平台（如“微博”）
    plat: string
    // 该图集的微博 ID
    id: string
    // 该图集的 URL
    url: string
    // 博主名
    name: string
    // 图集所属用户的 ID
    uid: string
    // 图集的标题
    caption: string
    // 图集的创建时间（不同于发布时间）。已转为 Unix时间戳（毫秒）
    created: number
    // 最大分辨率的图片地址列表
    urls: Array<string>
    // 中等分辨率的图片地址列表
    urls_m: Array<string>
  }

  // 获取的图集列表的信息
  export type PostsPayload = {
    // 最新的进度（图集的 ID）
    last: string | undefined,
    // 图集列表，如果为空集则不能保存最新的进度信息到存储
    posts: Album[]
  }
}

// 微博 API 返回信息
export namespace wb {
  // 微博列表 API 返回的数据
  export type WBList = {
    // 是否正确响应
    ok: number
    // 新请求开始获取的微博帖的 ID。为空""表示可能已读取玩可读的微博，需结束了
    since_id: string
    data: {
      // 当首次请求时的`page`参数不为`1`时，该值为空，需要避免首次`page`不为`1`的情况
      since_id: string
      list: Array<WBTopic>
      // 总博客数，除以默认页大小`20`，即为总页数
      total: number
    }
  }

  // 一条微博
  type WBTopic = {
    // 已收藏人数
    attitudes_count: number
    // 评论条数
    comments_count: number
    // 此条微博创建时间，如"Wed Dec 01 01:33:33 +0800 2021"
    created_at: string
    // 本人是否已收藏该条微博
    favorited: boolean
    // 该微博的 ID，如 419940710522042
    id: number
    // 该微博的 ID（同 mid），如"419940710522042"
    idstr: string
    // 是否为付费
    is_paid: boolean
    // 微博的 mblogid，如"L5wIulUw5"，可以根据算法和 mid 互转
    mblogid: string
    // 微博的 mid（同 idstr），如"419940710522042"
    mid: string
    // 包含的图片 ID 列表，如["006AfEgvgy13gw42p1oxyh5j3wx731v4qp"]，可使用该 ID 从 pic_infos 中获取详细信息
    pic_ids?: Array<string>
    // 包含的图片信息列表
    pic_infos: { [picID: string]: PicInfos }
    // 包含的图片数量
    pic_num: number
    // 浏览次数
    reads_count: number
    // 转发次数
    reposts_count: number
    // 客户端，如"iPhone客户端"
    source: string
    // 纯文本内容，如"点个赞吧<br/><img alt=\"[心]\" src=\"https://face.t.sinajs.cn/t4/example.png\"/>"
    text: string
    // 渲染后的文本内容，如"点个赞吧\n[心]"
    // 两个 text 都很可能含有“非零字符”，需要将之删除：text_raw.replace(/[\s\u200B-\u200D\uFEFF]/g, "")
    text_raw: string
    // 博主的信息
    user: User
    // 当为转贴时，为原贴数据
    retweeted_status: WBTopic
  }

  // 图片的详细信息
  type PicInfos = {
    // 缩略图，如
    thumbnail: PicInfo
    // 中等尺寸图片
    bmiddle: PicInfo
    // 大尺寸图片
    large: PicInfo
    // 原图
    original: PicInfo
    // 最大（推荐获取，分辨率最大）
    largest: PicInfo
    mw2000: PicInfo
    // 图片的 ID，如"006AfEgvgy13gw42p1oxyh5j3wx731v4qp"
    pic_id: string
    // 图片的状态，如 1
    pic_status: number
  }

  // 图片的分辨率、地址
  type PicInfo = {
    url: string;
    width: number;
    height: number;
  }

  // 用户信息
  type User = {
    // 用户ID
    id: number
    idstr: string
    // 博主名，如"高集"
    screen_name: string
    // 头像地址（大）
    avatar_large: string
    // 头像图片地址（可能上传时的原图）
    avatar_hd: string
    // 是否关注了“我”
    follow_me: boolean
    // “我”是否已关注该博主
    following: boolean
  }
}

// 任务信息
export namespace ptask {
  // 存储到 chromium storage 的数据，键为"picTasks"
  export type PicTasks = {
    // 是否启用任务，默认启用
    enable?: boolean
    list?: Array<Task>
  }

  // 平台
  export type Plat = "weibo"

  // 单个图片任务
  export type Task = {
    // 平台，如"weibo"
    plat: Plat
    // 用户 ID，如"123456"
    id: string
    // 已爬取图片的最近一条微博的 ID，如"4563128419479174"
    last?: string
  }

  // 用户信息
  export type TaskInfo = {
    name: string
    avatar: string
    description: string
  }
}