/* lexer.js  */
 
    
    //Globals
	var tokenStream = [];
    var lexemesArr = [];
    
    function lex()
    {
        // Grab the "raw" source code.
        var sourceCode = document.getElementById("taSourceCode").value;
        // Trim the leading and trailing spaces.
        sourceCode = sourceCode.trim();

        // Definitions for kinds of tokens so they can be compared 
        // with the src code, which will then be added to the token stream. 
        var keyword = /(while|if|print|int|string|boolean|false|true)/;
        var characterList = /("[a-z ]*")/; //May not need this
        var alpha = /([a-z])/; 
        var digit = /(\d)/;
        var symbol = /(\(|\)|{|}|\$|\"|==|!=|=|\+)/; 
        var whitespace = /\s/;
        var space = /( +)/;

        //Split on any white space, deliminators, and even id, char, and digits. 
        //Basically, split on anything we may find interesting, since that will be tokenized.
        var splitOnVals = /(while|if|print|int|string|boolean|false|true|[a-z]|[0-9]|\"|\(|\)|{|}|\$|==|!=|=|\+|\s|)/;
                            //Keywords                                     id/chars/digits              deliminators

        //Array to go through the source code to split it into possible tokens. Pass 1.
        var sourceCodeArray = sourceCode.split(splitOnVals);

        sourceCodeArray = sourceCodeArray.filter(function(e){ return e.replace(/(\r\n|\r)/gm,"")/*return e != undefined || e != ""*/});

        //Other way I thought to do this...
        //Make the token stream a 2D array, where a new array is created when a new line is encountered
        //Then, accesss the line num but which element it is in the array
            
        var newline = /(\n)/;
        var currentLineNum = 1;  //Initialize the line number
        for (i = 0; i < sourceCodeArray.length; i++){
            /*if(!newline.test(sourceCodeArray[i])){
                createLexeme(sourceCodeArray[i], currentLineNum);   
            }else{
                createLexeme(sourceCodeArray[i], currentLineNum);
                currentLineNum++;
            }*/
            if(newline.test(sourceCodeArray[i]) && currentLineNum == 0){
                currentLineNum++; //There has to be at least one line... right?
                createLexeme(sourceCodeArray[i], currentLineNum, false);
            }else if(newline.test(sourceCodeArray[i]) && currentLineNum >= 1){
                currentLineNum++; 
                createLexeme(sourceCodeArray[i], currentLineNum, false);
            }else if(space.test(sourceCodeArray[i])){
                createLexeme(sourceCodeArray[i], currentLineNum, true);
            }else if(!newline.test(sourceCodeArray[i])){
                createLexeme(sourceCodeArray[i], currentLineNum, false);
            }
        } 
        
        //Get rid of white space in the lexemesArr, as well as any empty array elements
        lexemesArr = lexemesArr.filter(function(lexeme){ return !whitespace.test(lexeme.frag)||!space.test(lexeme.isSpaceChar)});
        var isError = false;
        var insideString = false;
       
        for (i = 0; i < lexemesArr.length; i++){
            var currentLexeme = lexemesArr[i]; //Look at each potential token     
            if(space.test(currentLexeme.frag) && currentLexeme.isSpaceChar && insideString){  //maybe the wrong place for this
                createToken(currentLexeme.frag, "spaceChar", currentLexeme.lineNum); 
            }else if(space.test(currentLexeme.frag) && currentLexeme.isSpaceChar && !insideString){
                tokenStream.filter(function(lexeme){ return space.test(lexeme.isSpaceChar)});
            }else if(keyword.test(currentLexeme.frag) && !insideString){
                createToken(currentLexeme.frag, "keyword", currentLexeme.lineNum);
            }else if (alpha.test(currentLexeme.frag) && !insideString){
                createToken(currentLexeme.frag, "identifier", currentLexeme.lineNum);
            }else if (alpha.test(currentLexeme.frag) && insideString){                                        
                createToken(currentLexeme.frag, "stringChar", currentLexeme.lineNum); //will call a keyword a char if it is in a string   
            }else if (digit.test(currentLexeme.frag)){
                createToken(currentLexeme.frag, "digit", currentLexeme.lineNum);
            }else if (symbol.test(currentLexeme.frag)){
                switch(currentLexeme.frag){
                    case "{":
                        createToken(currentLexeme.frag, "openBlock", currentLexeme.lineNum);
                    break;
                    case "}":
                        createToken(currentLexeme.frag, "closeBlock", currentLexeme.lineNum);
                    break;
                    case "(":
                        createToken(currentLexeme.frag, "openParen", currentLexeme.lineNum);
                    break;
                    case ")":
                        createToken(currentLexeme.frag, "closeParen", currentLexeme.lineNum);
                    break;
                    case "\"": 
                        if(!insideString){
                            createToken(currentLexeme.frag, "openQuotation", currentLexeme.lineNum);
                            insideString = true;
                        }else if(insideString){
                            createToken(currentLexeme.frag, "closeQuotation", currentLexeme.lineNum);
                            insideString = false;
                        }
                    break;
                    case "==":
                        createToken(currentLexeme.frag, "testEquality", currentLexeme.lineNum);
                    break;
                    case "!=":
                        createToken(currentLexeme.frag, "testInEquality", currentLexeme.lineNum);
                    break;
                    case "=":
                        createToken(currentLexeme.frag, "assign", currentLexeme.lineNum);
                    break;
                    case "+":
                        createToken(currentLexeme.frag, "add", currentLexeme.lineNum);
                    break;
                    case "$":
                        createToken(currentLexeme.frag, "EOF", currentLexeme.lineNum);
                    break;
                    default:  createToken(currentLexeme.frag, "symbol", currentLexeme.lineNum);
                    break;
                }
            
            }else{
                makeError(currentLexeme.lineNum, " Invalid or unexpected token.");
                isError = true;               
        }
    }
        //TODO: error checks for EOF
        //if there was never an assigned EOF... this might not actually work: find the last assigned } and add a $, plus a warning saying it was added
        if(insideString){
            var errorQuote = tokenStream.filter(function(token){
                if (token.kind == "openQuotation"){
                    isError = true;
                    return makeError(token.lineNum, " did not find a matching closeQuotation.");
                }
            });
        }
        
        if(!isError){
        return tokenStream;
        }else{
        tokenStream = "nothing";
        return tokenStream;    
        //The error message will be displayed depending on what error lex found.  
        // should return a stream of tokens
        }
    } 

    function lexemeStruct(){
        this.frag = "";
        this.lineNum = -1;
        this.isSpaceChar = false;
    }

    function createLexeme(frag,lineNum,isSpaceChar){
        var lexeme = new lexemeStruct();
            lexeme.frag = frag;
            lexeme.lineNum = lineNum;
            lexeme.isSpaceChar = isSpaceChar;
            lexemesArr.push(lexeme);
    }

    //Makes an instance of a token to be added to the tokenStream
    function tokenStruct() {
        this.lexeme = "";        
        this.kind = ""; 
        this.lineNum = -1;
        this.toString = function(){
            return "<" + this.lexeme + "," + this.kind + ",line:" + this.lineNum + ">";
        }
    }

    function createToken(lexeme, kind, lineNum){
        var token = new tokenStruct();
            token.lexeme = lexeme;
            token.kind = kind;
            token.lineNum = lineNum;
            tokenStream.push(token);
    }

    function makeError(lineNum, message){
        document.getElementById("taOutput").value = "Lex error on line " + lineNum + ":" + message + "\n";
    }

    /*function identifyLexemes(srcCode){
    //Assigns lexemes and their line number. Makes sourceCodeArray an array of lexemes, so it's easier to get the line numbers.
    var newline = /(\n)/;
    currentLineNum = 1; //There has to be at least one line... right?
        for (i = 0; i < srcCode.length; i++){
            if(newline.test(srcCode[i])){
                currentLineNum++;
                srcCode[i] = createLexeme(srcCode[i], currentLineNum);
            }else if(!newline.test(srcCode[i])){
                srcCode[i] = createLexeme(srcCode[i], currentLineNum);
            }
        }
    }*/