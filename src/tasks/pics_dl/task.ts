import {request, sha256} from "do-utils"
import {sleep, download} from "do-utils"
import IconWeibo from "../../icons/weibo.svg"
import type {DoSnackbarProps} from "do-comps"
import type React from "react"
import {delRevoke} from "do-comps"
import type {pinfo} from "./types"
import type {ptask} from "./types"
import type {wb} from "./types"
import type {vpsInfoInit} from "../../pages/Options"

// 根据平台，获取指定用户的图集列表
export const sites = {
  weibo: {
    // 平台 logo
    platLogo: IconWeibo,

    // 获取任务主页
    getURL: (task: ptask.Task) => `https://weibo.com/u/${task.id}`,

    /**
     * 获取任务的详细信息，用于显示
     * @param task
     * @see https://www.jianshu.com/p/7f3b72c08f77
     */
    async check(task: ptask.Task): Promise<ptask.TaskInfo> {
      const apiUrl = `https://m.weibo.cn/api/container/getIndex?containerid=100505${task.id}`
      let resp = await request(apiUrl)
      let obj = await resp.json()

      if (!obj.data.userInfo) {
        return {name: "不存在该用户", description: `${task.plat} ${task.id}`, avatar: ""}
      }

      return {
        name: obj.data.userInfo.screen_name,
        avatar: obj.data.userInfo.avatar_hd,
        description: obj.data.userInfo.description
      }
    },

    /**
     * 返回微博的图集列表
     * 获取图集是从第一页，所以 idstr 是从大到小减序
     * 而在实际下载中，是按从小到大增序下载，这样可以保证：
     * 1. 获取图集时，当遇到微博ID为上次任务保存的ID时，说明获取完成，可以停止获取该用户的微博
     * 2. 下载图集时，后端可在下载每个图集后保存ID，当发生异常时，继续下载
     * @param task 需下载图片的任务
     */
    async getPosts(task: ptask.Task): Promise<pinfo.PostsPayload | undefined> {
      let postsList: pinfo.Album[] = []
      let page = 1
      let pageTotal = 0
      let lastIdstr = task.last

      // 微博 API 经常抽风，需要重试
      let retry = 0
      const MAX = 3
      while (true) {
        // 获取数据、解析
        // feature 为 0 表示获取原贴+转帖；为 1 表示只获取原贴
        let url = `https://weibo.com/ajax/statuses/mymblog?uid=${task.id}&page=${page}&feature=0`
        let resp = await request(url).catch(e => {
          console.log(`[${task.plat}][${task.id}] 获取图集出错，网络错误，将重新获取第 ${page} 页`, e)
        })
        if (!resp || !resp.ok) {
          if (retry < MAX) {
            console.log(`[${task.plat}][${task.id}] 服务器返回错误，将重新获取第 ${page} 页`)
            retry++
            continue
          }

          return undefined
        }

        let text = await resp.text()

        // 验证数据是否正确
        // 需要先登录
        if (text.indexOf("Sina Visitor System") >= 0) {
          console.log(`[${task.plat}][${task.id}] 获取图集出错，需要登录网站：`, "https://weibo.com")
          return undefined
        }

        // 服务器暂时错误，需重试
        //返回的是非JSON数据，无法解析，所以无法通过页数判断是否继续，所以放在`parse`前面
        if (text.indexOf("400 Bad Request") >= 0 || text.indexOf("Internal Server Error") >= 0) {
          if (retry < MAX) {
            console.log(`[${task.plat}][${task.id}] 服务器返回错误，将重新获取第 ${page} 页`)
            retry++
            continue
          }

          return undefined
        }

        let obj: wb.WBList = JSON.parse(text)
        if (pageTotal === 0) {
          pageTotal = Math.ceil(obj.data.total / 20)
        }

        // 获取的数据不正确，重新获取
        // 重试几次失败后，作为没有更多数据处理以返回
        if (page < pageTotal && obj.data.list.length === 0) {
          if (retry < MAX) {
            console.log(`[${task.plat}][${task.id}] 获取的数据不正确，将重新获取第 ${page} 页`)
            retry++
            continue
          }

          return {last: lastIdstr, posts: postsList}
        }

        // 提取图片的下载链接
        for (const [index, item] of obj.data.list.entries()) {
          // 当读取的帖子的 idstr 等于或小于已保存的进度记录，说明已读取到上次的地方，直接返回数据
          if (task.last && item.idstr.localeCompare(task.last) <= 0) {
            return {last: lastIdstr, posts: postsList}
          }

          // 保存第一页的第一个帖子的 idstr，将作为进度存储到 chromium storage
          if (page === 1 && index === 0) {
            lastIdstr = item.idstr
          }

          // 特殊处理
          // 因获取的图集不全，只下载了整个图集的前面一部分。判断直接从此点开始读取
          // 不能通过设置`page`获取，此时`since_id`为空，无法获取到图集数据
          // if (item.user.idstr === "6556637551" && item.idstr >= "4771572118978867") {
          //   break
          // }

          // 按分辨率存储图片的地址
          const album: Array<string> = []
          const albumM: Array<string> = []

          // 如果 retweeted_status 不为空，说明此为转贴，转而从原贴中获取图集数据
          let payload = item
          if (item.retweeted_status && item.retweeted_status.pic_ids) {
            payload = item.retweeted_status
          }

          // 该微博的图集为空，继续获取下一条微博的图集
          if (!payload.pic_ids || payload.pic_ids.length === 0) {
            continue
          }

          // 提取图集
          for (const picId of payload.pic_ids) {
            if (!payload.pic_infos[picId] || payload.pic_infos[picId].largest.url.length === 0) {
              continue
            }
            album.push(payload.pic_infos[picId].largest.url)
            albumM.push(payload.pic_infos[picId].original.url)
          }

          // 该条微博的标题、创建时间
          // 去除特殊字符
          let caption = payload.text_raw.replace(/[\s\u200B-\u200D\uFEFF]/g, "")
          let created = new Date(payload.created_at).getTime()
          let name = payload.user.screen_name

          // 添加图集到数组
          postsList.push({
            plat: "weibo",
            uid: task.id,
            name: name,
            id: payload.idstr,
            url: `https://weibo.com/${payload.user.id}/${payload.idstr}`,
            caption: caption,
            created: created,
            urls: album,
            urls_m: albumM
          })
          // console.log(PicSaveBG.TAG, "[微博]", "已添加图集：", item.idstr);
        }

        console.log(`[${task.plat}][${task.id}] 已添加第 ${page}/${pageTotal}(最大值) 页的图集`)

        if (pageTotal !== 0 && page > pageTotal && obj.data.list.length === 0) {
          console.log(`[${task.plat}][${task.id}] 已获取完最新图集`)
          return {last: lastIdstr, posts: postsList}
        }

        page++
        // 成功一次后，要重置已重试次数
        retry = 0
        await sleep(Math.random() * 2 * 1000)
      }
    }
  }
}

// 发送下载请求
// 新下载、重试下载失败的图集（此时 albums 需传递为 []）
const sendToDL = async (path: string,
                        albums: Array<pinfo.Album>,
                        showSb: (ps: DoSnackbarProps) => void,): Promise<boolean> => {
  let {addr} = await getPicVpsInfo()

  let headers = await genAccessHeaders()
  // @ts-ignore
  let resp = await request(`${addr}${path}`, albums, {headers})
    .catch(e => console.log("发送下载图集的请求出错", e))
  if (!resp) {
    showSb({open: true, severity: "error", message: "发送下载图集的请求出错"})
    return false
  }

  // 解析响应结果
  let result = await resp.json().catch(e => console.log("解析下载图集的响应出错：", e))
  if (!result || result.code !== 0) {
    showSb({open: true, severity: "error", message: "提交下载图集出错"})
    return false
  }

  console.log("已提交图集下载的任务")
  showSb({open: true, severity: "info", message: "已提交图集下载的任务"})
  return true
}

/**
 * 下载图集列表到本地
 * 可在 .then()中执行获取完**所有**任务后的操作
 */
export const startDLPics = async function (setWorking: React.Dispatch<React.SetStateAction<boolean>>,
                                           showSb: (ps: DoSnackbarProps) => void) {
  // 开始获取图集列表前，禁用下载按钮
  setWorking(true)

  // 先打开页面，等待登录
  console.log("已打开微博页面，等待登录…")
  window.open("https://weibo.com/")
  await sleep(3 * 1000)

  // 开始获取
  // 保存本次下载的所有图集信息
  let albums: Array<pinfo.Album> = []

  // 用于记录本次下载失败的平台，以便跳过剩下的同平台的任务
  let failLog = new Set<ptask.Plat>()

  // 读取 chromium storage 存储任务信息
  let data = await chrome.storage.sync.get({picTasks: {list: []}})
  let picTasks: ptask.PicTasks = data.picTasks

  // 任务列表为空
  if (!picTasks.list || picTasks.list.length === 0) {
    setWorking(false)
    showSb({open: true, severity: "info", message: "图集任务列表为空"})
    return
  }

  // 联网获取图集
  for (const task of picTasks.list) {
    // 跳过本次已下载失败的同平台的任务
    if (failLog.has(task.plat)) {
      continue
    }

    // 调用下载
    let payload: pinfo.PostsPayload | undefined = await sites[task.plat].getPosts(task)
    // 本任务下载失败时
    if (payload === undefined) {
      failLog.add(task.plat)
      showSb({open: true, severity: "warning", message: `获取图集出错，可能需要登录一次网站：${task.plat}`})
      continue
    }

    // 当图集数量为空时，不能保存最新的进度信息到存储
    if (payload.posts.length === 0) {
      console.log(`[${task.plat}][${task.id}] 没有新图集，不需保存进度`)
      showSb({open: true, severity: "info", message: `[${task.plat}][${task.id}] 没有新图集`})
      continue
    }

    let index = picTasks.list.findIndex(v => v.plat === task.plat && v.id === task.id)
    if (index >= 0) {
      picTasks.list[index].last = payload.last
    } else {
      console.log(`[${task.plat}][${task.id}] 找不到索引，无法保存进度`)
      showSb({open: true, severity: "warning", message: `[${task.plat}][${task.id}] 找不到索引，无法保存进度`})
      continue
    }

    albums.push(...payload.posts)

    console.log(`[${task.plat}][${task.id}] 已完成读取图集`)
  }

  // 判断是否有新图集需要下载
  if (albums.length === 0) {
    console.log("获取图集的数量为 0，不需下载")
    showSb({open: true, severity: "info", message: "获取图集的数量为 0，不需下载"})
    setWorking(false)
    return
  }

  // 将图集数据保存到本地
  download(JSON.stringify(albums, null, 2), `pics_tasks_${Date.now()}.json`)
  // 同时发送下载请求
  sendToDL("/api/pics/dl", albums, showSb)

  // 存储该任务的进度，之所以重读存储，是避免当执行任务时对该扩展进行设置而无效的问题
  let sData = await chrome.storage.sync.get({picTasks: {list: []}})
  sData.picTasks.list = picTasks.list
  await chrome.storage.sync.set({picTasks: sData.picTasks})

  setWorking(false)
}

/**
 * 重试之前下载失败的图集
 */
export const startRetry = (showSb: (ps: DoSnackbarProps) => void) => {
  sendToDL("/api/pics/dl/retry", [], showSb)
}

/**
 * 清除之前下载失败的图集数据
 */
export const clearFail = async (showSb: (ps: DoSnackbarProps) => void) => {
  let {addr} = await getPicVpsInfo()
  let headers = await genAccessHeaders()
  // @ts-ignore
  let resp = await request(`${addr}/api/pics/dl/clearfail`, [], {headers})
    .catch(e => console.log("清除失败的图集出错：", e))

  if (!resp) {
    showSb({open: true, severity: "error", message: "清除失败的图集出错"})
    return
  }

  const obj = await resp.json()
  if (obj.code !== 0) {
    showSb({open: true, severity: "error", message: obj.msg})
    return
  }

  showSb({open: true, severity: "success", message: "成功清除失败的图集数据"})
}

// 重置 chromium storage 中存储的任务**进度**
export const clearProcess = async (showSb: (ps: DoSnackbarProps) => void) => {
  // 读取 chromium 存储的数据
  let data = await chrome.storage.sync.get({picTasks: {}})
  let picTasks: ptask.PicTasks = data.picTasks

  // 任务列表为空
  if (!picTasks.list || picTasks.list.length === 0) {
    showSb({open: true, severity: "info", message: "图集任务列表为空"})
    return
  }

  // 删除、提供撤销按钮
  delRevoke<ptask.PicTasks>("图集任务进度", picTasks, () => {
    for (let task of picTasks.list || []) {
      task.last = undefined
    }
    chrome.storage.sync.set({picTasks: picTasks})
  }, async (origin) => {
    let data = await chrome.storage.sync.get({picTasks: {}})
    let picTasks: ptask.PicTasks = data.picTasks
    picTasks.list = origin.list
    await chrome.storage.sync.set({picTasks: picTasks})
  }, showSb)
}

/**
 * 获取图集下载服务的远程地址
 */
export const getPicVpsInfo = async (): Promise<typeof vpsInfoInit> => {
  let data = await chrome.storage.sync.get({settings: {vps: {}}})
  let vps: typeof vpsInfoInit = data.settings.vps

  // 因为远程服务器用`Nginx`做了代理，直接访问主域名即可，不需要添加端口
  // 所以只在本地测试时添加端口
  if (vps.addr.includes("127.0.0.1")) {
    vps.addr = `${vps.addr}:20200`
  }

  return vps
}

/**
 * 获取带有验证的请求头
 */
export const genAccessHeaders = async () => {
  let {authorization} = await getPicVpsInfo()

  return {"Authorization": "Bearer " + authorization}
}
