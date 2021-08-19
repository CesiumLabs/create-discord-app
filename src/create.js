import chalk from 'chalk';
import fs from 'fs';
import fse from 'fs-extra';
import cp from 'child_process';
import ora from 'ora';
import symbols from 'log-symbols';

export class CreateDiscordApp {

    constructor(path = ".", source = null, force = false) {
        this.path = path || ".";
        this.source = source;
        this.force = !!force;
    }

    initGit(gitCommit) {
        const commands = ["git init", "git add .", `git commit -m "${gitCommit}"`];
        const finalizingLoader = ora(chalk.blueBright("Finalizing...")).start();

        for (const command of commands) {
            try {
                cp.execSync(this.path === "." ? command : `cd ${this.path} && ${command}`);
            } catch(e) { /* Do nothing */ }
        }

        finalizingLoader.succeed(chalk.greenBright("Successfully created a discord bot project!"));
    }

    init(token = null, ops = { language: null, gitCommit = "created discord app." }) {
        if (this.force) console.log(symbols.warning, chalk.yellowBright("You have used --force, I hope you know what you are doing."));
        if (!this.source) return console.log(symbols.error, chalk.redBright("No source file(s) specified!"));

        let path = this.path === "." ? process.cwd() : `${process.cwd()}/${this.path}`;
        if (!fs.existsSync(path)) fs.mkdirSync(path);
        if (fs.readdirSync(path).length !== 0 && !this.force) return console.log(symbols.error, chalk.redBright("Mentioned directory is not empty! Use --force to override this.")); 
        else if (this.force && fs.readdirSync(path).length !== 0) {
            console.log(symbols.warning, chalk.yellowBright("Using --force, Content found in the specified dir, clearing..."));
            fse.emptyDirSync(path);
            console.log(symbols.success, chalk.greenBright("Directory cleared successfully!"));
        }

        fs.readdir(this.source, async (error, files) => {
            if (error) return console.log(symbols.error, chalk.redBright(error.message));

            const copyFileLoader = ora(chalk.cyanBright("Copying files...")).start();
            for (const file of files) {
                await fse.copy(`${this.source}/${file}`, `${path}/${file}`);
                await fse.writeFile(path.endsWith("/") ? path + ".env" : path + "/.env", `TOKEN=${token && typeof token === "string" ? token : "ENTER_YOUR_BOT_TOKEN"}`);
                await fse.writeFile(path.endsWith("/") ? path + ".gitignore" : path + "/.gitignore", "node_modules/\npackage-lock.json\n.env");
            }

            copyFileLoader.succeed(chalk.cyanBright("Finished copying files!"));
            const depInstaller = ora(chalk.blueBright("Installing dependencies...")).start();
            const installCommand = this.getInstallCommand(ops.language);
            if (!installCommand) return depInstaller.warn(chalk.yellowBright("Generated project but couldn't find an install command, please try again to install dependencies manually!"));

            cp.exec(this.path === "." ? command : `cd ${this.path} && ${installCommand}`, (error) => {
                if (error) return depInstaller.warn(chalk.yellowBright("Generated project but couldn't install dependencies, please try again manually!"));
                depInstaller.succeed(chalk.greenBright("Successfully installed dependencies!"));
                return this.initGit();
            });
        });
    }

    getInstallCommand(language) {
        if (language == "javascript" || language == "typescript") return "npm i";
        else return null;
    }

}