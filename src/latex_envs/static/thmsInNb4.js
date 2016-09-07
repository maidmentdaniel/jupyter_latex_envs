
/*
This script goes through the input text (actually it is triggered each time a markdown cell is rendered. The imput text is the content of the cell.
It replaces the latex structures by html tags, typically with a <div class="latex_environment_name> ... </div>. Then the html rendering 
can be customized using a devoted css. The original idea comes from
https://github.com/benweet/stackedit/issues/187
where the contributors to stackedit, the online markdown editor, discussed the processing of LaTeX environments. 
*/


/****************************************************************************************************************
* Series of elementary functions for manipulating nested environments
* needed to do that because standard regular expressions are not well suited for recursive things
****************************************************************************************************************/
var OPENINGENV = '#!<',
    OPENINGENVre = new RegExp(OPENINGENV, 'g');
var CLOSINGENV = '#!>',
    CLOSINGENVre = new RegExp(CLOSINGENV, 'g');

function envSearch(text, env_open, env_close) {
    var reg = new RegExp(env_open + '[\\S\\s]*?' + env_close, 'gm');
    var start = text.match(reg);
    var env_open_re = new RegExp(env_open);
    var env_close_re = new RegExp(env_close);
    var retval;
    var r = "";
    if (typeof(start[0]) != 'undefined' && start[0] != null) {
        var r = start[0].substr(1)
    }
    var out = env_open_re.test(r) //test if there exists an opening env at level +1 
        //of the same kind inside

    if (out) { //in such case: replace the new opening at level +1 and the closing at level
        var rnew = r.replace(env_close_re, CLOSINGENV).replace(env_open_re, OPENINGENV)
        .replace(/\$\$/g,"!@$!@$") //last replace is because "$$" in the replacement string does not work
        var text = text.replace(r, rnew).replace(/!@\$/g,"$");
        if (env_open_re.test(rnew)) { // if it remains nested envs, call the function again
            retval = envSearch(text, env_open, env_close);
            if (retval !== undefined) {
                text = retval;
            }
        }
        return text
    }
    return text
}

function nestedEnvSearch(text, env_open, env_close) {
    var regtest = new RegExp(env_open + '[\\S\\s]*?' + env_close);
    var inmatches = text.match(regtest);
    if (inmatches != null) {
        for (i = 0; i < inmatches.length; i++) 
            inmatches[i] = inmatches[i].replace(/\*/g, '\\*')
        var n = 0;
        env_open = env_open.replace(/\([\\\+\S ]*?\)/g, function() {
            return inmatches[++n]
        })
        env_close = env_close.replace(/\\\d/g, function(x) {
            return inmatches[parseInt(x.substr(1))]
        })
        var output = envSearch(text, env_open, env_close)
        var matches = output.match(env_open + '([\\S\\s]*?)' + env_close);
        matches[0] = matches[0].replace(OPENINGENVre, env_open.replace('\\\\', '\\'))
            .replace(CLOSINGENVre, env_close.replace('\\\\', '\\'))
        matches[1] = matches[1].replace(OPENINGENVre, env_open.replace('\\\\', '\\'))
            .replace(CLOSINGENVre, env_close.replace('\\\\', '\\'))
        var result = [matches[0], inmatches[1], matches[1]]
        for (i = 0; i < result.length; i++) 
            result[i] = result[i].replace(/\\\*\}/g, '*}')
        return result;
    } else return [];
}


function envReplaceApply(text, matches, replacement) {
    var output;
    if (matches.length != 0) {
        if (replacement instanceof Function) {
            output = text.replace(matches[0], 
                replacement(matches[0], matches[1], matches[2])
                .replace(/\$\$/g,"!@$!@$")).replace(/!@\$/g,"$") 
                //last line because "$$" in the replacement string does not work
        } else if (typeof replacement == "string") {
            output = text.replace(matches[0], replacement)
        }
        return output
    } else {
        return text;
    }
}

function nestedEnvReplace(text, env_open, env_close, replacement, flags) {
    var list_of_matches = [];
    var count = 200; //protection
    var matches = nestedEnvSearch(text, env_open, env_close);
    if (flags == undefined) {
        return envReplaceApply(text, matches, replacement)
    } else if (flags.indexOf('g') !== -1) {
        var tmp_text = text; // tmp text
        while (count-- > 0 & matches.length != 0) {
            list_of_matches.push(matches[0]);
            tmp_text = tmp_text.replace(matches[0], ""); //suppress from tmp_text
            text = envReplaceApply(text, matches, replacement);
            matches = nestedEnvSearch(tmp_text, env_open, env_close);
        }
        return text;
    } else {
        return text;
    }
}

/****************************************************************************************/
//Initialization of conversions maps (useful for direct call of this file)

//**********************************************************************************************************
function initmap(){
    var eqLabNums = {};
    var thmCounter  = { num: 0 };
    var excsCounter = { num: 0 };
    var figCounter = { num: 0 };
    var cit_table={}


    var environmentMap = {
                    thm:      { title: "Theorem"    ,counter: thmCounter  },
                    lem:      { title: "Lemma"      ,counter: thmCounter  },
                    cor:      { title: "Corollary"  ,counter: thmCounter  },
                    prop:     { title: "Property"   ,counter: thmCounter  },
                    defn:     { title: "Definition" ,counter: thmCounter  },
                    rem:      { title: "Remark"     ,counter: thmCounter  },
                    prob:     { title: "Problem"    ,counter: excsCounter },
                    excs:     { title: "Exercise"   ,counter: excsCounter },
                    examp:    { title: "Example"    ,counter: excsCounter },
                    property:     { title: "Property"   ,counter: thmCounter  },
                    theorem:      { title: "Theorem"    ,counter: thmCounter  },
                    lemma:        { title: "Lemma"      ,counter: thmCounter  },
                    corollary:    { title: "Corollary"  ,counter: thmCounter  },
                    proposition:  { title: "Proposition" ,counter: thmCounter },
                    definition:   { title: "Definition" ,counter: thmCounter  },
                    remark:       { title: "Remark"     ,counter: thmCounter  },
                    problem:      { title: "Problem"    ,counter: excsCounter },
                    exercise:     { title: "Exercise"   ,counter: excsCounter },
                    example:      { title: "Example"    ,counter: excsCounter },
                    figure:       { title: "Figure"    ,counter: figCounter },
                    itemize:      { title: "Itemize"     },
                    enumerate:    { title: "Enumerate"    },
                    listing:      { title: " "    },
                    textboxa:     { title: " "  },
                    proof:        { title: "Proof" }
                };


    //This is to substitute simple LaTeX+argument commands 
    // For instance \textbf{foo} is replaced by <b> foo </b>
    var cmdsMap =  {
        underline:  {  replacement: "u"  },
        textit:     {  replacement: "i"  },
        textbf:     {  replacement: "b"  },
        textem:     {  replacement: "em" },
        section:    {  replacement: "h1" },
        subsection: {  replacement: "h2" },
    }
    return [environmentMap, cmdsMap, eqLabNums, cit_table]
}

// init maps and tables
var maps = initmap();
environmentMap=maps[0];
cmdsMap=maps[1];
eqLabNums=maps[2];
cit_table = maps[3]

/******************************************************************************/

function remove_maths(text){
    var math=[]
    function replacement(m0,m1,m2) {
        math.push(m0)
        return "@@" + math.length + "@@";
    }
    text = text.replace(/\\\[([\S\s]*?)\\\]/gm,replacement)
    text = text.replace(/\\\(([\S\s]*?)\\\)/gm,replacement)
    text = text.replace(/\$\$([\S\s]*?)\$\$/gm,replacement)    
    text = text.replace(/\$([\S\s]*?)\$/gm,replacement)    
    text = nestedEnvReplace(text, '\\\\begin{(\\w+\\\*?)}', '\\\\end{\\1}', replacement, 'g')    
    return [math, text]
}

function restore_maths(math_and_text) {
    var math = math_and_text[0];
    var text = math_and_text[1];
    var newtext;
    var cont = true;
    while (cont) {
        var newtext = text.replace(/@@(\d+)@@/gm, function(wholeMatch, n) {
            return math[n - 1];
                });
        cont = text !== newtext; //recurse in text (possible nesting -- just one level)
        text=newtext;
    }
    return text;
}

/****************************************************************************************************************
*       Conversion of LaTeX structures, LaTeX environments present in a markdown text; 
*			- LaTeX environmnts and commands defined in environmentMap and cmdMap are replaced by an html div, with
*				a class corresponding to the environment. The actual rendering is defined and can be customized in 
*				the css latex_envs.css. 
*			- substitutions of labels \label{} with anchors
*			- substitutions of refs \ref{} with links
*			- substitutions of citations \cite{} with anchors and a link to the reference section
*			- LaTeX commands (textbf, textit, etc) replaced by html tags           
*
******************************************************************************************************************/

function thmsInNbConv(marked,text) {

  /*  // Modify marked renderer for paragraphs
    var MyRenderer = new marked.Renderer()
    MyRenderer.paragraph = function(text) {
        return text + '\n';
    };
    marked.setOptions({
        renderer: MyRenderer,
    });
    */

    var listings = [];

            { //****************************************************************************
                var EnvReplace = function(message) {
                    
                    //Restore incorrect replacements done during mathjaxutils.remove_math(text); [MarkdownCell.prototype.render]
                    // This may occur if the environment is NOT extracted, which occurs when there is a blank line in it
                    //This also allows to highlight text in latex_envs using the highlighter extension
                    var message = message.replace(/&lt;(div|span)[\S\s]*&lt;\/(\1)&gt;/gm,
                        
                        function(wholeMatch,m1,m2) {
                               wholeMatch = wholeMatch.replace(/&lt;/gm,'<');
                               wholeMatch = wholeMatch.replace(/&gt;/gm,'>');
                            return wholeMatch
                        })
                    //Look for pairs [ ]
                    var message = message.replace(/^(?:<p>)?\[([\s\S]*?)^(?:<p>)?\]/gm,
                        function(wholeMatch, m1) {
                            // this should not occur anymore
                            //return "\\["+m1+"\\]";
                            m1 = m1.replace(/<[/]?em>/g, "_"); //correct possible incorrect md remplacements in eqs
                            m1 = m1.replace(/left{/g, "left\\{"); //correct possible incorrect md remplacements in eqs
                            m1 = m1.replace(/right}/g, "right\\}"); //correct possible incorrect md remplacements in eqs
                            return "\\[" + m1 + "\\]";
                        }
                    );
                    var message = message.replace(/(?:<p>)?([$]{1,2})([\s\S]*?)(?:<p>)?\1/gm,
                        function(wholeMatch, m1) {
                            wholeMatch = wholeMatch.replace(/<[/]?em>/g, "_"); //correct possible incorrect md remplacements in eqs
                            wholeMatch = wholeMatch.replace(/left{/g, "left\\{"); //correct possible incorrect md remplacements in eqs
                            wholeMatch = wholeMatch.replace(/right}/g, "right\\}"); //correct possible incorrect md remplacements in eqs
                            return wholeMatch;
                        }
                    );

                    var out = nestedEnvReplace(message, '\\\\begin{(\\w+\\\*?)}', '\\\\end{\\1}', function(wholeMatch, m1, m2) {
                    //var out = message.replace(/\\begin{(\w+)}([\s\S]*?)\\end{\1}/gm, function(wholeMatch, m1, m2) {
                        //if(!environmentMap[m1]) return wholeMatch;
                        var environment = environmentMap[m1];
                        if (!environment) return wholeMatch;


                        var title = environment.title;
                        if (environment.counter) {
                            environment.counter.num++;
                            title += ' ' + environment.counter.num;
                        }
                        //The conversion machinery (see marked.js or mathjaxutils.js) extracts text and math and converts text to markdown. 
                        //Here, we also want to convert the markdown contained in our latex envs. 
                        //So we do it here. However, environments with blank lines are *not* extracted before and thus already converted. 
                        // Thus we avoid to process them again.
                        // Try to check if there is remaining Markdown
                        // |\n\s-[\s]*(\w+)/gm
                        // /\*{1,2}([\s\S]*?)\*{1,2}|\_{1,2}([\s\S]*?)\_{1,2}/gm)

                        // First remove "maths" (maths and included envs)
                        var math_and_m2=remove_maths(m2)
                        var math=math_and_m2[0]
                        var m2=math_and_m2[1]
                        
                        // and then convert the content 
                        //var m2 = marked(m2);
                        if (m2.match(/\*{1,2}([\s\S]*?)\*{1,2}|\_{1,2}([\S]*?)\_{1,2}|```/gm)) {
                            var m2 = marked(m2);
                        }
                        m2 = m2.replace(/^[\s]*<\/p>/,"<br>")    // opening <div> tag (below) automatically closes the <p>
                                                            // so we replace the </p> by a <br>
                        var result = '<br><span class="latex_title">' + title + '</span> <div class="latex_' + m1 + '">' + m2;

                        // case of the figure environment. We look for an \includegraphics directive, gobble its parameters except the image name,
                        // look for a caption and a label and construct an image representation with a caption and an anchor. Style can be customized 
                        // via the class latex_img

                        if (m1 == "figure") {
                            
                            var captionPresent = /\\caption{([\s\S]*?)}/gm.exec(m2);
							if (captionPresent!=null) {var caption=captionPresent[1]} 
							else var caption="";
                            var graphic = /\\includegraphics(?:[\S\s]*?){([\s\S]*?)}/gm.exec(m2)[1];
                            var label = m2.match(/<a id=([\s\S]*?)a>/gm); //label is already replaced
                            if (!caption.match(/<a id=([\s\S]*?)a>/gm)) {caption=label+caption};
                            
                            var result = '<div class="latex_figure"> <img class="latex_img" src="'+graphic+'"> '
							if (captionPresent!=null) {result+='<p class="latex_img"> ' +  title+': ' + caption + '</p>';};
						};



                        if (m1 == "proof") {
                            result += '<span class="latex_proofend" style="float:right">■</span>';
                        }

                        if (m1 == "itemize") {
                            var result = "<div><ul>" + m2.replace(/\\item/g, "<li>") + "</ul>";
                        };

                        if (m1 == "enumerate") {
                            var result = "<div class='latex_list'><ol>" + m2.replace(/\\item/g, "<li>") + "</ol>";
                        };
                        if (m1 != "listing") {
                            result = restore_maths([math, result])
                            result = EnvReplace(result);
                        }; //try to do further replacements


                        return result + '</div>';
                    },'gm'); // end of nestedEnvReplace
                    return out; //}

                }
            } 




            //**********************************************************************************
            // What follows is done on the whole text, environments included:
            // - substitutions of labels with anchors
            // - substitutions of ref with links
            // - LaTeX commands (textbf, textit, etc) replaced by html tags

            // We want to preserve a "listing" environment from **any modification**
                // therefore we remove them and insert them back at the end
            
            var remove_listing = function (text)  {

                text = text.replace(/\\begin{listing}([\s\S]*?)\\end{listing}/gm, function(wholeMatch, m1) {
                listings.push(m1); 
                return '!@!Listing'+listings.length+'!@!'; //originallistings location are marked by !@!Listingn!@!, n being the index of listing
                });
               
                return text;
            };

            text = remove_listing(text)  

            // Now we can do our stuff


            {
                // This is to replace references by links to the correct environment, 


                // FOR EQUATIONS, LABELS ARE DETECTED AS eq:something and an anchor is inserted 
                // before the environment (this used for labels as eq reference)

                var text = text.replace(/\\begin{([\S\s]*?)}[\S\s]*?\\label{eq:([\S\s]*?)}[\S\s]*?\\end{\1}/g, 
                function(wholeMatch, m1, m2) {
                var withoutLabel=wholeMatch.replace(/\\label{eq:([\S\s]*?)}/g,'');
                return '<a id="mjx-eqn-' + 'eq' + m2 + '">'+'</a>' + wholeMatch; //+withoutLabel;
                }); 

                //LABELS
                var text = text.replace(/\\label{(\S+):(\S+)}/g, function(wholeMatch, m1, m2) {
                    m2 = m2.replace(/<[/]?em>/g, "_");
                    if (m1 == "eq") {
                            if (eqLabelWithNumbers) {
                                return wholeMatch;
                                // This is now delegated to MathJax
                            } 
                            return '\\tag{' + m2 + '}' + '<!--' + wholeMatch + '-->';
               }
                    return '<a class="latex_label_anchor" id="' + m1 + m2 + '">' + '[' + m1 + ':' + m2 + ']' + '</a>';
                });


                //REFERENCES
                var text = text.replace(/\\ref{(\S+):(\S+)}/g, function(wholeMatch, m1, m2) {
                    m2 = m2.replace(/<[/]?em>/g, "_");
                        if (m1 == "eq") {
                        if (!eqLabelWithNumbers) { // this is for displayin the label
                        return '<a class="latex_ref" href="#mjx-eqn-' + m1 + m2 + '">' + m2 + '</a>'; //m1 + ':' + m2;
                        }
                         else  return wholeMatch;
                         }
                    return '<a class="latex_ref" href="#' + m1 + m2 + '">' + '[' + m1 + ':' + m2 + ']' + '</a>';
                });

                //CITATIONS
                var text = text.replace(/\\cite(\[[\S\s]+\])?{([\w\s-_,:]+)}/g, function(wholeMatch, additional_text, keys) {
			    //key=key.toUpperCase();
				var keys = keys.split(',');
				for (var k in keys) {
				key=keys[k].trim();
                if (!(key in cit_table)){
					switch (cite_by) {
						case 'number':
							cit_table[key]={'key':current_cit++, 'citobj':{}} 
							break;
						case 'key':
							cit_table[key]={'key':key, 'citobj':{}}
							break;
						case 'apalike':
							var apacit="?"
							if (key.toUpperCase() in document.bibliography){
								var cc=document.bibliography[key.toUpperCase()];
								var apacit=formatAuthors(makeAuthorsArray(cc['AUTHOR']),'Given',2)+', '+ cc['YEAR']}
							cit_table[key]={'key':apacit, 'citobj':{}}
							break;
						default: 
							cit_table[key]={'key':key, 'citobj':{}}
					}
				
                }
				}


				var opening_cit='[';  var closing_cit=']';                
				if (cite_by=='apalike'){var opening_cit='(';  var closing_cit=')' }
				
				// if several items, eg a \cite{ref1, ref2}, then build the reference as a series of
				// ids and links to the references section. The corresponding list of keys is
				// surrounded with opening_cit and closing_cit characters.
				 
				cit = keys.reduce(function(x,key){
				key=key.trim();
				return x + '<a id="call-'+ key + '"'+'class="latex_cit" href="#cit-' + key + '">'
				+ cit_table[key]['key']+ '</a>'+', '; 
				}, "")
				cit = opening_cit + cit.slice(0,cit.length-2);
				if (additional_text!= undefined) {cit+=', '+ additional_text;}
				cit+= closing_cit ;

//                var cit = '<a id="call-'+ keys[0] + '"'+'class="latex_cit" href="#cit-' + keys[0] + '">'+ opening_cit; 
//				for (var k in keys) {
//					key=keys[k].trim();
//                	cit+= cit_table[key]['key'] + ', '
//				}
//				cit = cit.slice(0,cit.length-2)+ closing_cit + '</a>';                ;
                    
                if (additional_text!=undefined)
                    cit = '<a id="call-'+ key + '"'+'class="latex_cit" href="#cit-' + key + '">' + opening_cit + cit_table[key]['key'] 
                        + ', ' + additional_text.substring(1,additional_text.length-1)+ closing_cit + '</a>';
                    
                return cit
                });



                {

//*********************** Environments replacements *****************
                    text = EnvReplace(text);
//********************************************************************

                    // LaTeX commands replacements (eg \textbf, \texit, etc)
                    var text = text.replace(/\\([\w]*){(.+?)}/g, function(wholeMatch, m1, m2) {

                        var cmd = cmdsMap[m1];
                        if (!cmd) return wholeMatch;
                        var tag = cmd.replacement;
                        return '<' + tag + '>' + m2 + '</' + tag + '>';
                    });
                    //support for comments (mask them in rendered version)
                    text = text.replace(/^(<p>)?%[\S ]*\n/gm,'$1')

                    //Other small replacements
                    var text = text.replace(/\\index{(.+?)}/g, function(wholeMatch, m1) {
                        return '';
                    });
                    var text = text.replace(/\\noindent/g, "");
                    var text = text.replace(/\\(?:<\/p>)/g, "</p>");
                    
                    //Support for \par for line breaks
                    var text = text.replace(/\\par\s/g, "<br/>");
                    // quad and \qquad 
                    var text = text.replace(/\\quad\s/g, "&nbsp;");
                    var text = text.replace(/\\qquad\s/g, "&nbsp;&nbsp;");
                    // \vspace
                    var text = text.replace(/\\vspace{(.+?)}/g, function(wholeMatch, m1) {
                        var pat=/[\s]*(-?)\d+/;
                        var thisspace="";
                        var part1='<p class="mspace" style="padding-left:0.5em;';
                        var part2='display:block;"></p>';
                        var them=m1.match(pat);
                        if(them[1]=="-"){
                            thisspace="margin-top:"+m1+";";
                        }
                        else{
                        thisspace='height:'+m1+ ';';
                        }
                        return part1+thisspace+part2;
                    });    

                    // \hspace 
                    var text = text.replace(/\\hspace{(.+?)}/g, function(wholeMatch, m1) {
                        var pat=/[\s]*(-?)\d+/;
                        var thisspace="";
                        var part1='<span class="mspace" style="padding-left:0.5em;height: 0em; vertical-align: 0em;';
                        var part2='display: inline-block; overflow: hidden;"></span>';
                        var them=m1.match(pat);
                        if(them[1]=="-"){
                            thisspace="margin-left:"+m1+";";
                        }
                        else{
                        thisspace='width:'+m1+ ';';
                        }
                        return part1+thisspace+part2;
                    }); 

                };
                
            };

            //insert back listings in the text

            text = text.replace(/!@!Listing(\d+)!@!/gm, function(wholeMatch, n) {
                        return '<pre>' + listings[n-1] + '</pre>';
            });
            return text;

        };
