export namespace DYSSeries {
  // 请求某个合集的响应
  export interface SeriesResp {
    // 0 表示正常
    code: number
    message: string
    ttl: number
    data: Data
  }

  export interface Data {
    // 合集内视频的 aid 列表
    aids: number[]
    // 当前请求的页数信息
    page: Page
    // 合集内视频集的列表
    archives: Arc[]
  }

  // 当前请求的页数信息
  export interface Page {
    // 当前页数，如 1
    num: number
    // 每页视频数量，默认 30
    size: number
    // 当前合集包含的视频数量
    total: number
  }

  // 合集内视频集的信息
  export interface Arc {
    // 视频集的 aid
    aid: number
    // 视频集的 bvid
    bvid: string
    // 合集集的标题
    title: string
    // 发布日期的时间戳（秒），如 1663043650
    pubdate: number
    ctime: number
    state: number
    // 视频集的封面地址
    pic: string
    // 视频集内所有视频的时长和
    duration: number
    stat: Stat
    ugc_pay: number
    interactive_video: boolean
  }

  // 视频集的浏览信息
  export interface Stat {
    // 已观看次数
    view: number
  }
}

export namespace DYSMyVideos {
  export interface MyVideosResp {
    code: number
    message: string
    ttl: number
    data: Data
  }

  export interface Data {
    list: List
    page: Page
  }

  export interface List {
    vlist: Vlist[]
  }

  export interface Vlist {
    // 视频评论数（网页下面的评论）。如 300
    comment: number
    typeid: number
    // 播放次数。如 97829
    play: number
    // 封面地址。如 "http://i1.hdslb.com/bfs/archive/04e9b20398d8a7fd7da6f9b0e50d620675101e8d.jpg"
    pic: string
    // 视频的标题
    title: string
    // 子标题。通常为空""
    subtitle: string
    // 视频的描述。在播放页面中视频的下面
    description: string
    copyright: string
    review: number
    // 作者用户名。如 "老实憨厚的笑笑"
    author: string
    // 作者 ID。如 8739477
    mid: number
    // 创建的时间戳(秒)。如 1670090556
    created: number
    // 视频（含合集）的总时长（时分）。如 "538:50"
    length: string
    video_review: number
    // 视频的 aid。如 433345047
    aid: number
    // 视频的 bid。如 "BV1cG411T7H5"
    bvid: string
    hide_click: boolean
    // 是否付费。0为免费
    is_pay: number
    is_union_video: number
    is_steins_gate: number
    is_live_playback: number
    meta: any
    is_avoided: number
    attribute: number
  }

  export interface Page {
    // 当前页
    pn: number
    // 每页视频数
    ps: number
    // 总视频数
    count: number
  }
}

// 视频信息。用于展示视频
export type DYSVideo = {
  title: string
  bvid: string
  // 封面地址
  pic: string
  // 播放次数
  play: number
  // 创建时间戳（秒）
  created: number
}