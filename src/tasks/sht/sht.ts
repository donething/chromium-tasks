/**
 * SHT 签到
 */
import {request} from "do-utils"

const TAG = "[SHT]"

const addr = "https://www.sehuatang.net"

// 持久存储的数据
interface Data {
  // 已回过贴的 ID
  ids?: string[]
}

// 回帖
const reply = async (tid: string) => {
  // 先访问网页提取 formhash、fid
  const htmlResp = await request(`https://www.sehuatang.net/forum.php?mod=viewthread&tid=${tid}`)
  const htmlText = await htmlResp.text()
  const htmlResult = htmlText.match(/【出演女优】：(?<actress>.+?)【[^]+name="formhash"\svalue="(?<formhash>.+?)"[^]+name="srhfid"\svalue="(?<fid>\d+)"/)
  if (!htmlResult || !htmlResult.groups) {
    throw Error(`提取 actress、formhash、fid 出错：'${htmlText}'`)
  }
  const {actress, formhash, fid} = htmlResult.groups

  // 预提交回帖
  await fetch("https://www.sehuatang.net/forum.php?mod=ajax&action=checkpostrule&inajax=yes&ac=reply")

  // 开始真实回帖
  const now = Math.floor(Date.now() / 1000)
  const data = `file=&message=非常感谢，支持 ${actress}&posttime=${now}&formhash=${formhash}&usesig=&subject=++`
  const replyResp = await request(`https://www.sehuatang.net/forum.php?mod=post&action=reply&fid=${fid}&tid=${tid}&extra=page%3D1&replysubmit=yes&infloat=yes&handlekey=fastpost&inajax=1`, data)
  const replyText = await replyResp.text()
  if (!replyText.includes("回复发布成功")) {
    throw Error(`回帖失败：'${replyText}'`)
  }

  return true
}

// 每日签到前，需要先回一帖
const replyFirstThread = async () => {
  const resp = await request("https://www.sehuatang.net/forum.php?mod=forumdisplay&fid=103")
  const text = await resp.text()
  const ids = [...text.matchAll(/id="normalthread_(\d+)"/g)].map(m => m[1])

  if (!ids || ids.length === 0) {
    throw Error("无法解析到帖子的 ID")
  }

  const data: Data = await chrome.storage.sync.get({sht: {}})
  if (!data.ids) {
    data.ids = []
  }

  // 回复一个帖子
  for (let id of ids) {
    if (data.ids.includes(id)) {
      continue
    }

    console.log(TAG, "回帖：", `https://www.sehuatang.net/forum.php?mod=viewthread&tid=${id}`)
    await reply(id)

    // 保存回帖记录
    data.ids.push(id)
    await chrome.storage.local.set({sht: data})
    return
  }

  throw Error("该页面所有帖子都回复过，此次无法回帖")
}

// 签到
const sign = async () => {
  // 判断是否已签到、需要登录
  const signHtml = await request("https://www.sehuatang.net/plugin.php?id=dd_sign:index")
  const signHtmlText = await signHtml.text()
  if (signHtmlText.includes("尚未登录")) {
    console.log(TAG, "需要先登录，再运行")
    chrome.tabs.create({url: "https://www.sehuatang.net/plugin.php?id=dd_sign:index"})
    return
  }
  if (signHtmlText.includes(">今日已签到<")) {
    console.log(TAG, "今日已签到过，不重复签到")
    return
  }

  // 先回帖
  console.log(TAG, "签到前回帖：")
  await replyFirstThread()

  // 点击签到页的签到按钮，解析需要的数据
  const signBnResp = await request(`${addr}/plugin.php?id=dd_sign&ac=sign&infloat=yes&handlekey=pc_click_ddsign&inajax=1&ajaxtarget=fwin_content_pc_click_ddsign`, new FormData())

  const signBnText = await signBnResp.text()
  const hashResult = signBnText.match(/id="signform_(?<signform>.+?)"[^]+name="formhash"\svalue="(?<formhash>.+)"[^]+id="secqaa_(?<idhash>.+)"/)
  if (!hashResult || !hashResult.groups) {
    throw Error(`无法解析到需要的表单信息：'${hashResult}'`)
  }
  const {signform, formhash, idhash} = hashResult.groups
  if (!signform || !formhash || !idhash) {
    throw Error(`表单的解析结果中缺少必要的信息：${JSON.stringify(hashResult.groups)}`)
  }

  // 获取验证问题
  const secqaaResp = await request(`${addr}/misc.php?mod=secqaa&action=update&idhash=${idhash}&${Math.random()}`)

  const secqaaText = await secqaaResp.text()
  const secqaaMatch = secqaaText.match(/class="vm"[^]+?'(.+?)=/)
  if (!secqaaMatch || secqaaMatch.length < 2) {
    throw Error(`无法提取到验证问题'${secqaaText}'`)
  }
  const answer = calStr(secqaaMatch[1])

  // 真正提交签到
  const data = `formhash=${formhash}&signtoken=&secqaahash=${idhash}&secanswer=${answer}`
  const signResp = await request(`${addr}/plugin.php?id=dd_sign&ac=sign&signsubmit=yes&handlekey=pc_click_ddsign&signhash=${signform}&inajax=1`, data)
  const signText = await signResp.text()

  if (!signText.includes("签到成功")) {
    throw Error(`签到失败：'${signText}'`)
  }

  console.log(TAG, "签到成功")
  return true
}

// 计算字符串型的四则运算
const calStr = (expression: string) => {
  let parts = expression.split(' ')
  let operand1 = Number(parts[0])
  let operator = parts[1]
  let operand2 = Number(parts[2])

  switch (operator) {
    case '+':
      return operand1 + operand2
    case '-':
      return operand1 - operand2
    case '*':
      return operand1 * operand2
    case '/':
      return operand1 / operand2
    default:
      throw new Error(`未知的运算符'${operator}'`)
  }
}

const Sht = {sign, replyFirstThread, TAG}

export default Sht
