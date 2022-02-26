const CopyPlugin = require('copy-webpack-plugin');
const path       = require('path');

module.exports = {
    devtool : false,
    mode : 'development',
    entry : {
        background : path.resolve(__dirname, 'src/ts/background.ts'),
        index : path.resolve(__dirname, 'src/ts/index.ts'),
    },

    module : {
        rules : [
            {
                test : /\.ts$/,
                use : 'ts-loader',
                exclude : /node_modules/,
            },
            {
                test : /\.css$/,
                exclude : /node_modules/,
                use : [
                    "style-loader",
                    {
                        loader : "css-loader",
                        options : {url : false},
                    }
                ]
            }
        ]
    },

    resolve : {
        extensions : [ '.ts', '.js' ],
    },

    output : {
        filename : '[name].js',
        path : path.resolve(__dirname, 'dist/js'),
    },

    plugins : [
        new CopyPlugin({
            patterns : [
                {
                    from : '*.json',
                    to : '../',
                    force : true,
                    context : path.resolve(__dirname, 'src')
                },
                {
                    from : '*.html',
                    to : '../',
                    force : true,
                    context : path.resolve(__dirname, 'src')
                },
                {
                    from : 'icons',
                    to : '../icons',
                    context : path.resolve(__dirname, 'src')
                }
            ]
        }),
    ]
};