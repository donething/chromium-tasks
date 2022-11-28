namespace DYS {
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