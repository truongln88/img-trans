"use strict";

const walk = require("klaw");
const winston = require("winston");
const chalk = require("chalk");
const fs = require("fs-extra");
const metadata = require("./metadata");
const path = require("path");

const moveFile = (file, targetFile, move) => {
    winston.info(chalk.green(`   targeting '${targetFile}'...`));

    if (fs.existsSync(targetFile)) {
        winston.info(chalk.green(`   ${targetFile} exists`));
        const fileBuff = fs.readFileSync(file);
        const targetFileBuff = fs.readFileSync(targetFile);
        if (fileBuff.equals(targetFileBuff)) {
            // files are same
            winston.info(chalk.green("   files are same"));
            if (move) {
                winston.info(chalk.green(`   source file '${file}' will be removed`));
                fs.removeSync(file);
            }
        } else {
            const extension = path.extname(targetFile);
            const newTargetFile = path.join(path.dirname(targetFile), `${path.basename(targetFile, extension)}_diff${extension}`);
            // files are different but same name
            winston.info(chalk.green(`   rename to ${newTargetFile}`));
            moveFile(file, newTargetFile);
        }
    } else {
        if (move) {
            fs.moveSync(file, targetFile);
        } else {
            fs.copySync(file, targetFile);
        }
    }
};

const migrateSingleFile = (file, targetDirectory, move) => {
    winston.info(chalk.blue(`Move '${file}' to ${targetDirectory}`));

    try {
        const createdDate = metadata.createdDate(file);
        const year = createdDate.year();
        const month = createdDate.month();
        const date = createdDate.date();

        const finalDirectory = path.join(targetDirectory, `${year}`, `${month + 1}`, `${date}`);
        fs.ensureDirSync(finalDirectory);

        const targetFile = path.join(finalDirectory, path.basename(file));
        moveFile(file, targetFile, move);
    } catch (error) {
        winston.warn(chalk.yellow(`   skipped because of '${error}'`));
    }
};

const migrate = async (sourceDirectory, targetDirectory, move = true) => {
    fs.ensureDirSync(targetDirectory);

    return new Promise((resolve, reject) => {
        walk(sourceDirectory)
            .on("data", item => {
                if (item.stats.isFile()) {
                    migrateSingleFile(item.path, targetDirectory, move);
                }
            })
            .on("end", () => {
                resolve();
            })
            .on("error", reject)
    });
};

module.exports = {
    migrate
};