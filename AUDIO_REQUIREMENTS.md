# 中关村学院建大楼 音乐音效需求清单

## 1. 文档目的

这份文档用于整理当前游戏版本需要准备的音乐与音效素材，方便后续统一采买、外包、制作或找素材库替代。

当前游戏是一款偏轻松、偏校园包装的建塔点击游戏，核心情绪关键词建议统一为：

- 轻快
- 明亮
- 校园感
- 施工感但不过于硬核
- 命中反馈清晰
- 通关有庆祝感

建议整体避免过重的工业机械风，优先采用“卡通施工 + 青春校园 + 轻竞技反馈”的音色方向。

## 2. 建议先做的最小音频包

如果你想先准备一个能上线的 MVP 音频包，建议先做这 12 个素材：

### 音乐

1. `bgm_gameplay_main`
   - 主玩法循环 BGM
   - 用途：整局游戏主背景音乐

2. `jingle_victory`
   - 通关结算短音乐
   - 用途：解锁 C9 后播放

3. `jingle_fail`
   - 失败结算短音乐
   - 用途：3 次 Miss 后播放

### 音效

4. `ui_button_tap`
   - 通用按钮点击
   - 用途：帮助、开始建设、重新开始、进度节点点击

5. `game_block_release`
   - 吊机放块
   - 用途：点击屏幕/空格释放方块

6. `game_block_land_good`
   - 普通成功落位
   - 用途：`Good` 判定

7. `game_block_land_perfect`
   - 精准落位
   - 用途：`Perfect` 判定

8. `game_block_miss_fall`
   - 掉落失败
   - 用途：`Miss` 判定

9. `game_unlock_stage`
   - 阶段解锁提示
   - 用途：C1/C2/C3/C5/C7/C8/C9 解锁

10. `game_fever_activate`
    - Fever 激活提示
    - 用途：Perfect 触发 Fever 时播放

11. `game_score_bonus`
    - 加分/奖励提示
    - 用途：出现容纳人数增长、Fever 加成时播放

12. `ui_popup_open`
    - 弹窗出现
    - 用途：教学弹窗、结果弹窗出现

如果时间和预算有限，这 12 个先做出来就够支撑首版体验。

### 2.1 初版 12 素材生成提示词

说明：

- BGM 使用 `Suno`
- 音效使用 `ElevenLabs`
- 提示词尽量保持简洁，可直接复制后再微调

#### Suno 提示词

1. `bgm_gameplay_main`
   - 提示词：
   - `60 seconds, upbeat and bright campus tower-building game loop BGM, light electronic, xylophone, plucks, soft drums, slight cartoon construction rhythm, positive and uplifting, no vocals, not too dense, suitable for long looping.`

2. `jingle_victory`
   - 提示词：
   - `3 seconds, bright celebratory victory jingle, rising notes, golden sparkling feel, campus festival vibe, clean and punchy, no vocals.`

3. `jingle_fail`
   - 提示词：
   - `2 seconds, gentle failure jingle, soft descending notes, simple ending, slightly disappointing but not too sad, no vocals.`

#### ElevenLabs 提示词

4. `ui_button_tap`
   - 提示词：
   - `0.15 seconds, crisp and soft game button tap, short, clean, light cartoon UI style.`

5. `game_block_release`
   - 提示词：
   - `0.25 seconds, light mechanical click for a cartoon crane releasing a block, clear, slight metallic feel, not heavy.`

6. `game_block_land_good`
   - 提示词：
   - `0.3 seconds, successful block landing sound, solid but light, slightly bouncy, standard success feedback.`

7. `game_block_land_perfect`
   - 提示词：
   - `0.35 seconds, perfect landing sound effect, crisp hit with a slight sparkle, brighter and more satisfying than a normal landing.`

8. `game_block_miss_fall`
   - 提示词：
   - `0.6 seconds, missed block falling sound, slight failure warning feel, cartoon style, not realistic heavy industry.`

9. `game_unlock_stage`
   - 提示词：
   - `0.8 seconds, stage unlock notification sound, rising notes, bright reward feel, slight campus vibe and sense of achievement.`

10. `game_fever_activate`
    - 提示词：
    - `0.45 seconds, Fever activation sound, quick bright burst, charged energy feel, bright and impactful.`

11. `game_score_bonus`
    - 提示词：
    - `0.18 seconds, score bonus notification sound, light upbeat rise, short and clear, suitable for number increase and reward feedback.`

12. `ui_popup_open`
    - 提示词：
    - `0.25 seconds, light card pop-up sound, soft, clean, with a UI panel appearing feel.`

## 3. 完整音乐需求

### 3.1 主循环 BGM

#### 1) `bgm_gameplay_main`

- 类型：循环背景音乐
- 场景：正常建塔过程
- 情绪：轻快、积极、带一点施工节奏感
- 风格建议：
  - 轻电子
  - 木琴 / pluck / marimba
  - 轻鼓点
  - 少量机械敲击感作为点缀
- 时长建议：50 到 90 秒可无缝循环
- 备注：
  - 需要兼容长时间重复聆听
  - 不要太吵，避免压过判定音效

### 3.2 结果音乐

#### 2) `jingle_victory`

- 类型：短音乐 / 结算 jingles
- 场景：达成 C9，学院建成
- 情绪：明亮、庆祝、完成目标
- 时长建议：2 到 4 秒
- 风格建议：
  - 上升音型
  - 金色感、闪亮感
  - 可以带一点校园广播/庆典感

#### 3) `jingle_fail`

- 类型：短音乐 / 结算 jingles
- 场景：Miss 达到 3 次失败
- 情绪：轻微遗憾，但不要太挫败
- 时长建议：1.5 到 3 秒
- 风格建议：
  - 下行音型
  - 轻失误感
  - 不要做成恐怖或过重惩罚

### 3.3 可选增强音乐

这些不是首版必需，但如果想提升质感，优先级很高：

#### A. `stinger_stage_unlock`

- 类型：短提示音乐
- 场景：解锁新楼栋阶段时
- 作用：比普通解锁音效更有“到达节点”的仪式感

#### B. `stinger_fever`

- 类型：短提示音乐
- 场景：进入 Fever 状态
- 作用：强化 Perfect 带来的爽感

#### C. `bgm_gameplay_variant_*`

- 类型：阶段变体 BGM
- 场景：不同建设阶段切换时
- 建议做法：
  - 不必为 C1 到 C9 各做 1 首完整曲
  - 更推荐 1 首主循环 + 2 到 3 套变体层
  - 例如：清晨蓝 / 活力橙 / 完成金 三个版本

## 4. 完整音效需求

## 4.1 UI 交互音效

#### 1) `ui_button_tap`

- 场景：通用按钮点击
- 覆盖：
  - `?` 帮助按钮
  - `开始建设`
  - `重新开始`
  - 进度节点切换
- 风格：清脆、短促、偏软
- 时长建议：80 到 180ms

#### 2) `ui_popup_open`

- 场景：教学弹窗、结果弹窗出现
- 风格：轻弹出、轻卡片感
- 时长建议：150 到 300ms

#### 3) `ui_popup_close`

- 场景：关闭教学，正式进入游戏
- 风格：干净的收起音
- 时长建议：100 到 220ms
- 备注：如果预算有限，可与 `ui_button_tap` 复用

#### 4) `ui_progress_select`

- 场景：点击已解锁阶段节点查看介绍
- 风格：轻提示、不抢戏
- 时长建议：80 到 160ms
- 备注：也可与 `ui_button_tap` 复用

## 4.2 核心玩法音效

#### 5) `game_block_release`

- 场景：玩家释放当前方块
- 风格：轻机械释放、吊机松钩、轻金属咔哒
- 时长建议：120 到 250ms
- 目标：让“点击已生效”立即被听见

#### 6) `game_block_fall_whoosh`

- 场景：方块下落过程
- 风格：短促空气划过声
- 时长建议：150 到 350ms
- 备注：可选，不一定每次都要很明显

#### 7) `game_block_land_good`

- 场景：`Good` 判定成功落位
- 风格：厚一点的落块声，带轻微弹性
- 时长建议：180 到 350ms
- 目标：有“落上去了”的满足感，但明显弱于 Perfect

#### 8) `game_block_land_perfect`

- 场景：`Perfect` 判定
- 风格：
  - 清晰命中
  - 带闪光感
  - 比 `Good` 更亮、更干净
- 时长建议：180 到 420ms
- 目标：一听就知道是高质量命中

#### 9) `game_block_miss_fall`

- 场景：`Miss` 判定
- 内容建议：
  - 落空
  - 坠落
  - 轻警示
- 时长建议：300 到 700ms
- 目标：让玩家感知“这一层没接住”

#### 10) `game_miss_warning`

- 场景：Miss 次数增加时的附加警示
- 风格：轻警报 / 红色提示感
- 时长建议：120 到 260ms
- 备注：可和 `game_block_miss_fall` 分层，也可合并成一个音

## 4.3 状态与奖励音效

#### 11) `game_unlock_stage`

- 场景：首次达到楼层节点，解锁 C1/C2/C3/C5/C7/C8/C9
- 风格：
  - 上升音阶
  - 校园感
  - 有“阶段达成”的奖励感
- 时长建议：400 到 900ms

#### 12) `game_fever_activate`

- 场景：Perfect 触发 Fever
- 风格：
  - 迅速点亮
  - 有能量充满/激活感
- 时长建议：250 到 500ms

#### 13) `game_fever_loop_hint`

- 场景：Fever 持续期间
- 风格：低音量持续闪耀/脉冲感
- 时长建议：短循环或氛围层
- 备注：非必需，建议低音量混在 BGM 下

#### 14) `game_score_bonus`

- 场景：本次落位产生人数增长、或显示 `+X 人`
- 风格：轻奖励提示、数字跳增感
- 时长建议：80 到 180ms

#### 15) `game_perfect_combo`

- 场景：连续 Perfect 时
- 风格：可逐步升调，强化连击手感
- 时长建议：100 到 220ms
- 备注：这是高配项，不做也能上线

## 4.4 结算与流程音效

#### 16) `ui_game_start`

- 场景：点击“开始建设”，从教学进入游戏
- 风格：清爽起步感
- 时长建议：150 到 300ms
- 备注：可和 `ui_popup_close` 合并

#### 17) `ui_restart`

- 场景：点击重新开始
- 风格：清脆重置感
- 时长建议：100 到 220ms
- 备注：可与 `ui_button_tap` 复用

#### 18) `ui_result_popup`

- 场景：胜利/失败结果卡弹出
- 风格：卡片出现 + 结算提示
- 时长建议：180 到 350ms
- 备注：如果已有 `ui_popup_open`，可以不单独做

#### 19) `game_win_impact`

- 场景：胜利瞬间
- 风格：解锁终点、金色完成感
- 时长建议：500 到 1200ms
- 备注：可与 `jingle_victory` 叠用，也可合并

#### 20) `game_fail_impact`

- 场景：失败瞬间
- 风格：偏短、轻失误收尾
- 时长建议：300 到 700ms
- 备注：可与 `jingle_fail` 合并

## 5. 推荐优先级

### P0：首版必须有

- `bgm_gameplay_main`
- `ui_button_tap`
- `game_block_release`
- `game_block_land_good`
- `game_block_land_perfect`
- `game_block_miss_fall`
- `game_unlock_stage`
- `game_fever_activate`
- `jingle_victory`
- `jingle_fail`

### P1：强烈建议补齐

- `ui_popup_open`
- `ui_popup_close`
- `game_score_bonus`
- `game_miss_warning`
- `ui_game_start`
- `ui_restart`

### P2：增强质感

- `game_block_fall_whoosh`
- `game_fever_loop_hint`
- `game_perfect_combo`
- `stinger_stage_unlock`
- `stinger_fever`
- 阶段变体 BGM

## 6. 建议的制作方向

### 音乐方向

- 主 BGM 不要太满，给判定音和 UI 音留空间
- 节奏可以有摆动感，呼应吊机左右摆动
- 校园主题优先于纯工地主题
- 胜利音乐要明显比失败音乐更完整、更有结束感

### 音效方向

- `Perfect / Good / Miss` 三者差异必须足够大
- `Perfect` 应该“亮、准、爽”
- `Good` 应该“稳、厚、普通成功”
- `Miss` 应该“空、掉、警示”
- UI 音尽量统一一套质感，避免素材库拼凑感过重

## 7. 建议交付规格

如果你要找人制作或自己整理素材，建议统一以下规格：

- 格式：`wav` 母版 + `ogg` 或 `mp3` 游戏用版本
- 采样率：`44.1kHz` 或 `48kHz`
- 位深：`16-bit` 或 `24-bit`
- 声道：立体声
- 命名方式：统一英文 snake_case

示例：

- `bgm_gameplay_main.ogg`
- `game_block_land_perfect.ogg`
- `game_unlock_stage.ogg`

## 8. 建议音量层级

为了后续接入方便，建议在素材制作时先按下面思路控制主观响度：

- BGM：最低
- UI 音：中低
- 普通玩法音效：中
- Perfect / 解锁 / Fever：中高
- 胜利 jingles：中高
- 失败 jingles：中

原则是：判定反馈必须压得过 BGM，但不要刺耳。

## 9. 按实际玩法事件对应的音频点位

基于当前版本实现，实际会触发音频的关键时机如下：

### 开始前

- 打开教学弹窗
- 点击“开始建设”
- 点击帮助按钮重新打开教学

### 对局中

- 点击施工区域 / 空格释放方块
- 方块落下
- 判定为 `Perfect`
- 判定为 `Good`
- 判定为 `Miss`
- Miss 次数增加
- 人数增加提示出现
- Fever 激活
- 新阶段节点解锁
- 点击进度节点查看对应介绍

### 结算时

- 达成 C9 胜利
- 失败结算
- 结果卡弹出
- 点击重新开始

## 10. 最终建议

如果你现在只想尽快准备素材，最实用的方案是：

1. 先准备 `1 首主循环 BGM + 2 个结算 jingles + 7 到 9 个核心音效`
2. 第二轮再补 `Fever、节点解锁、弹窗、奖励提示`
3. 第三轮再考虑“分阶段 BGM 变体”和“连击递进音”

这样投入最省，但玩家听感已经会完整很多。
