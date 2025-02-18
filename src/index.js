const core = require('@actions/core');
const github = require('@actions/github');
const { context } = github;

async function run() {
  try {
    // 获取输入参数
    const tagCommit = core.getInput('tag-commit', { required: true });
    const tagMinCount = parseInt(core.getInput('tag-min-count') || '10', 10);
    const tagMinDays = parseInt(core.getInput('tag-min-days') || '30', 10);
    const prefix = 'i-bak-';

    // 获取 GitHub token
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('需要 GITHUB_TOKEN 环境变量');
    }
    const octokit = github.getOctokit(token);
    const { owner, repo } = context.repo;

    // 创建新的 tag
    const dateStr = new Date().toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const tagDateStr = dateStr.replace(/[/:]/g, '-').replace(/[ ]/g, '.');
    const newTag = `${prefix}${tagDateStr}`;

    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/tags/${newTag}`,
      sha: tagCommit,
    });

    // 获取所有以 i-bak- 开头的 tag，并获取它们的创建时间
    const { data: refs } = await octokit.rest.git.listMatchingRefs({
      owner,
      repo,
      ref: `tags/${prefix}`,
    });

    // 优化标签获取逻辑，使用批量请求
    const getTags = async (refs) => {
      const batchSize = 10;
      const results = [];

      for (let i = 0; i < refs.length; i += batchSize) {
        const batch = refs.slice(i, i + batchSize);
        const batchPromises = batch.map((ref) =>
          octokit.rest.git.getCommit({
            owner,
            repo,
            commit_sha: ref.object.sha,
          })
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(
          ...batchResults.map((result, index) => ({
            name: batch[index].ref.replace('refs/tags/', ''),
            date: new Date(result.data.author.date),
          }))
        );
      }

      return results;
    };

    // 使用优化后的函数
    const tags = await getTags(refs);
    // 按创建时间从旧到新排序
    tags.sort((a, b) => a.date - b.date);

    // 如果 tag 数量超过最小保留数量，则清理旧的 tag
    if (tags.length > tagMinCount) {
      const now = new Date();
      const minDate = new Date(now.getTime() - tagMinDays * 24 * 60 * 60 * 1000);

      for (const tag of tags) {
        // 跳过最新的 tagMinCount 个 tag
        if (tags.indexOf(tag) >= tags.length - tagMinCount) continue;

        // 如果 tag 创建时间早于最小保留天数，则删除
        if (tag.date < minDate) {
          await octokit.rest.git.deleteRef({
            owner,
            repo,
            ref: `tags/${tag.name}`,
          });
          core.info(`已删除旧的 tag: ${tag.name}`);
        }
      }
    }
  } catch (error) {
    core.setFailed(`Action 执行失败: ${error.message}`);
    console.error('详细错误信息:', error);
  }
}

run();
