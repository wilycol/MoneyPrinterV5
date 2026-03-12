import { App } from "./src/app";

const main = async () => {
    App.listen({
        port: 3001,
        idleTimeout: 255,
    });
    console.log("Running Server on port 3001");
};

main()
    .then()
    .catch((e) => console.error(e));
