const fs = require("fs");
const path = require("path");
const $RefParser = require('json-schema-ref-parser');
const apiFolder = path.join(__dirname, "../", "src/app/services/api/");
const swaggerJSON = "./dummySwagger.json";


const getSwaggerDefinitions = async () => {
    const swaggerData = await $RefParser.bundle(swaggerJSON,
        {
            dereference: { circular: false },
            resolve: { http: { timeout: 20000 } }
        });
    const definitions = Object.keys(swaggerData.definitions);
    return definitions.map((definition) => {
        const className = definition.split(".").pop();
        return { def: definition, className }
    })
}


const getAllFiles = async (dirPath = "./") => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const files = entries
        .filter(file => !file.isDirectory())
        .map(file => ({ ...file, dir: path.join(dirPath) }));
    const folders = entries.filter(folder => folder.isDirectory());
    for (const folder of folders) {
        files.push(...await getAllFiles(path.join(dirPath, folder.name)));
    }
    return files;
}

const updateFileName = async (filePath, oldFileName, newFileName) => {
    fs.rename(path.join(filePath, oldFileName), path.join(filePath, newFileName), (error) => {
        if (error) {
            console.log("Error while file rename :", error);
        } else {
            console.log("=> " + oldFileName + " renamed to " + newFileName);
        }
    })
}

const updateClassName = async (filePath, oldClassName, newClassName) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf-8', (error, fileData) => {
            if (error) {
                reject(error);
            }
            const updatedData = fileData.replace(new RegExp(oldClassName, "g"), newClassName);
            fs.writeFile(filePath, updatedData, "utf-8", (error) => {
                if (error) {
                    reject(error);
                }
                resolve();
            })
        })
    });
}


const updateImports = async (filePath, oldImport, newImport) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf-8', (error, fileData) => {
            if (error) {
                reject(error);
            }
            console.log("fileData", fileData);
            const updatedData = fileData.replace(new RegExp(oldImport, "g"), newImport);
            fs.writeFile(filePath, updatedData, "utf-8", (error) => {
                if (error) {
                    reject(error);
                }
                resolve();
            })
        })
    });
}


getSwaggerDefinitions().then(swaggerDefinitions => {
    getAllFiles(apiFolder).then(files => {
        for (const file of files) {
            for (const swaggerDefinition of swaggerDefinitions) {
                const defNameWithoutDot = swaggerDefinition.def.toLowerCase().replace(/\./g, "");
                const fileNameWithoutDash = file.name.toLowerCase().replace(/-/g, "");
                if (`${defNameWithoutDot}.model.ts` === fileNameWithoutDash) {
                    const updatedModelName = swaggerDefinition.className.split(/(?=[A-Z])/).join('-').toLowerCase() + ".model.ts";
                    updateClassName(path.join(file.dir, file.name), swaggerDefinition.def.replace(/\./g, ""), swaggerDefinition.className).then(() => {
                        updateFileName(file.dir, file.name, updatedModelName);
                    }).catch((err) => {
                        console.log(err);
                    });
                }
                if (`${defNameWithoutDot}.service.ts` === fileNameWithoutDash) {
                    const updatedServiceName = swaggerDefinition.className.split(/(?=[A-Z])/).join('-').toLowerCase() + ".service.ts";
                    updateClassName().then(() => {
                        updateFileName(file.dir, file.name, updatedServiceName);
                    }).catch(err => { console.log(err) });
                }
            }
        }
    });
})






