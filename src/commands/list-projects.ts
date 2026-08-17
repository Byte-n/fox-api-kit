import { Command } from 'commander';
import { fetchAccessibleProjects } from '../services/project';

export const COMMAND_NAME = 'list-projects';

export const listProjectsCommand = new Command(COMMAND_NAME)
  .description('通过 Apifox 开放 API 列出当前 token 可访问的所有项目')
  .action(async () => {
    const projects = await fetchAccessibleProjects();
    console.log(JSON.stringify({ total: projects.length, projects }, null, 2));
  });
